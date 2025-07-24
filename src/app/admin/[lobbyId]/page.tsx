"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { RealtimeChannel } from "@supabase/supabase-js";
import ProtectedAdminRoute from "@/components/ProtectedAdminRoute";
import { Game, Member, Round, Phrase } from "@/types";
import Countdown from "@/components/Countdown";
import CountdownTimer from "@/components/CountdownTimer";
import { ROUND_TIMER, STARTING_PHRASE } from "@/contants";
import ReviewAlbumPage from "@/components/Review/ReviewAlbumPage";

export default function AdminLobbyPage() {
  const supabase = createSupabaseClient();
  const params = useParams();
  const { lobbyId } = params as { lobbyId: string };

  const [completedRecordings, setCompletedRecordings] = useState<Set<string>>(
    new Set()
  );
  const [members, setMembers] = useState<Member[]>([]);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [startCountdown, setStartCountdown] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [startTimeFromSupabase, setStartTimeFromSupabase] = useState<
    string | null
  >(null);
  const [hasCreatedRound, setHasCreatedRound] = useState(false);
  const [manualMode, setManualMode] = useState(true); // default to manual
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUsedLanguage, setLastUsedLanguage] = useState<string | null>(null);
  const [reviewPhrases, setReviewPhrases] = useState<Phrase[][] | null>(null);

  const LANGUAGES = ["chinese", "malay", "tamil"];

  function getNextLanguage(
    roundNumber: number,
    isReview: boolean,
    previousLang: string | null
  ): string {
    if (roundNumber === 1 || isReview) return "english";

    const available = LANGUAGES.filter((lang) => lang !== previousLang);

    return available[Math.floor(Math.random() * available.length)];
  }

  useEffect(() => {
    if (!currentGame) return;

    const roundCheck = async () => {
      const { data: latestRound } = await supabase
        .from("mermurs_rounds")
        .select("*")
        .eq("game_id", currentGame.id)
        .order("round_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestRound?.start_time) {
        const start = new Date(latestRound.start_time).getTime();
        const now = Date.now();
        const remaining = Math.max(ROUND_TIMER - (now - start) / 1000, 0);

        setStartTimeFromSupabase(latestRound.start_time);
        setTimerRemaining(remaining);
      }
    };

    if (currentGame.status === "in_progress") {
      roundCheck();
    }
  }, [currentGame, rounds]);

  const fetchCurrentGame = async () => {
    const { data, error } = await supabase
      .from("mermurs_games")
      .select("*")
      .eq("lobby_code", lobbyId)
      .neq("status", "ended")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      setCurrentGame(data);
      fetchRounds(data.id);
    }
  };

  const fetchRounds = async (gameId: string) => {
    const { data, error } = await supabase
      .from("mermurs_rounds")
      .select("*")
      .eq("game_id", gameId)
      .order("round_number", { ascending: true });

    if (!error && data) {
      setRounds(data);
    }
  };

  const createGame = async () => {
    if (!channelRef.current) return;
    const { data, error } = await supabase
      .from("mermurs_games")
      .insert([{ lobby_code: lobbyId, status: "waiting" }])
      .select()
      .single();

    if (!error && data) {
      toast.success("New game created");
      setCurrentGame(data);
      setRounds([]);
      await channelRef.current.send({
        type: "broadcast",
        event: "newGame",
        payload: { game_data: data },
      });
    }
  };

  const handleCreateRound = async (isReview: boolean = false) => {
    if (!currentGame || members.length === 0) return;
    setIsProcessing(true);

    if (channelRef.current) {
      await channelRef.current.send({
        type: "broadcast",
        event: "processing_started",
      });
    }

    const previousRoundNumber = rounds.length;
    const nextRoundNumber = previousRoundNumber + 1;
    const now = new Date().toISOString();
    const oldLanguage = lastUsedLanguage;
    const nextLanguage = getNextLanguage(
      nextRoundNumber,
      isReview,
      lastUsedLanguage
    );
    setLastUsedLanguage(nextLanguage);

    const { data: previousRecordings, error: recErr } = await supabase
      .from("mermurs_recordings")
      .select("*")
      .eq("game_id", currentGame.id)
      .eq("round_id", rounds.slice(-1)[0].id);

    console.log(previousRecordings);

    if (previousRoundNumber > 0 && (recErr || !previousRecordings)) {
      toast.error("Couldn't fetch last round's recordings.");
      setIsProcessing(false);
      return;
    }

    console.log(nextLanguage);

    console.log(previousRecordings);

    const processed = await Promise.all(
      (previousRecordings || []).map(async (rec) => {
        console.log("PROMISE");
        const res = await fetch("/api/processRecording", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio_url: rec.audio_path,
            phrase_id: rec.id,
            check_id: rec.phrase_id,
            old_language: oldLanguage,
            next_language: nextLanguage,
          }),
        });
        if (!res.ok) {
          console.log(res);
          console.error("⚠️ processing failed for", rec.id);
          return null;
        }
        return (await res.json()) as {
          phrase_id: string;
          transcribed_text: string;
          processed_audio_url: string;
          assist_text: string;
          translated_text: string;
        };
      })
    );

    console.log(nextLanguage);

    const { data: newRound, error: roundErr } = await supabase
      .from("mermurs_rounds")
      .insert([
        {
          game_id: currentGame.id,
          round_number: nextRoundNumber,
          start_time: now,
          language: nextLanguage,
        },
      ])
      .select()
      .single();

    if (roundErr || !newRound || !processed) {
      toast.error("Couldn't create new round.");
      setIsProcessing(false);
      return;
    }

    console.log(processed);
    console.log(members);

    const rotatedPhrases = processed
      .filter((r) => r) // drop any failed
      .map((value) => {
        if (!value) return;
        const {
          phrase_id,
          transcribed_text,
          processed_audio_url,
          assist_text,
          translated_text,
        } = value;
        console.log(phrase_id);
        // find who spoke it
        const rec = previousRecordings!.find((x) => x.id === phrase_id)!;
        console.log(rec);
        const idx = members.findIndex((m) => m.uuid === rec.player_id);
        const target = members[(idx + 1) % members.length];
        return {
          game_id: currentGame.id,
          round_number: nextRoundNumber,
          round_id: newRound.id,
          player_id: target.uuid,
          text: transcribed_text,
          audio: processed_audio_url,
          language: nextLanguage,
          assist_text: assist_text,
          translated_text: translated_text,
          original_phrase_id: rec.phrase_id,
        };
      });

    const { error: insertErr } = await supabase
      .from("mermurs_phrases")
      .insert(rotatedPhrases);

    if (insertErr) {
      console.error("⚠️ couldn’t insert rotated phrases", insertErr);
      toast.error("Failed to assign next-round phrases.");
    }

    if (isReview) {
      await supabase
        .from("mermurs_games")
        .update({ is_review: true, status: "review" })
        .eq("id", currentGame.id);
      setCurrentGame((g) => g && { ...g, is_review: true, status: "review" });
    }

    console.log(rotatedPhrases);

    setRounds((rs) => [...rs, newRound]);
    setCompletedRecordings(new Set());
    setIsProcessing(false);
    toast.success(
      isReview ? "Last round created!" : `Round ${nextRoundNumber} created!`
    );
    if (channelRef.current) {
      await channelRef.current.send({
        type: "broadcast",
        event: "processing_done",
      });
    }
  };

  const updateGameStatus = async (status: string) => {
    if (!currentGame) return;
    const { error } = await supabase
      .from("mermurs_games")
      .update({ status })
      .eq("id", currentGame.id);

    if (!error) {
      toast.success(`Game status set to ${status}`);
      setCurrentGame(
        (prev) => prev && { ...prev, status: status as Game["status"] }
      );
    }
  };

  const kickMember = async (memberId: string) => {
    if (!channelRef.current) return;

    try {
      await channelRef.current.send({
        type: "broadcast",
        event: "kick",
        payload: { kickedMember: memberId },
      });
      toast.success(`${memberId} has been kicked.`);
    } catch (error) {
      console.error("Error kicking member:", error);
      toast.error("Failed to kick member.");
    }
  };

  const resetRounds = async () => {
    if (!currentGame) return;

    const { error: deleteError } = await supabase
      .from("mermurs_rounds")
      .delete()
      .eq("game_id", currentGame.id);

    if (deleteError) {
      toast.error("Failed to reset rounds.");
      return;
    }
    setRounds([]);
  };

  const startGame = async () => {
    await resetRounds();
    await updateGameStatus("start_game");
    setStartCountdown(true);
  };

  const endGame = async () => {
    await updateGameStatus("ended");
    setCurrentGame(null);
    setRounds([]);
  };

  useEffect(() => {
    fetchCurrentGame();

    const presenceChannel = supabase
      .channel(`presence-lobby:${lobbyId}`, {
        config: { presence: { key: `admin-${lobbyId}` } },
      })
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setMembers(
          Object.entries(state).map(([key, value]) => {
            const presence = value[0] as unknown as Member;
            return {
              id: key,
              name: presence.name,
              uuid: presence.uuid,
              image: presence.image,
            };
          })
        );
      })
      .on("broadcast", { event: "recording_done" }, (payload) => {
        const { player_id } = payload.payload;
        setCompletedRecordings((prev) => new Set(prev).add(player_id));
      })
      .on("broadcast", { event: "recording_again" }, (payload) => {
        const { player_id } = payload.payload;
        setCompletedRecordings((prev) => {
          const updated = new Set(prev);
          updated.delete(player_id);
          console.log([...updated]);
          return updated;
        });
      })
      .subscribe();

    channelRef.current = presenceChannel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [lobbyId]);

  const getReview = async () => {
    if (!currentGame) {
      toast.error("No Game Found");
      return;
    }

    const { data, error } = await supabase
      .from("mermurs_phrases")
      .select("*,mermurs_players(*)")
      .eq("game_id", currentGame.id);

    if (error || !data) {
      toast.error("Review Phrases Not Found");
      return;
    }

    // Step 1: Build child lookup map
    const childMap = new Map<string, Phrase>();
    for (const phrase of data) {
      if (phrase.original_phrase_id) {
        childMap.set(phrase.original_phrase_id, phrase);
      }
    }

    // Step 2: Build forward chain from rootId
    function buildForwardChain(rootId: string): Phrase[] {
      const chain: Phrase[] = [];
      let current = data?.find((p) => p.id === rootId);
      while (current) {
        chain.push(current);
        current = childMap.get(current.id);
      }
      return chain;
    }

    // Step 3: Find all roots (phrases without original_phrase_id)
    const rootPhrases = data.filter((p) => !p.original_phrase_id);

    // Step 4: Build all chains
    const chains: Phrase[][] = rootPhrases.map((root) =>
      buildForwardChain(root.id)
    );

    // ✅ Now you have `chains`, an array of phrase chains
    console.log("Chains for review:", chains);
    setReviewPhrases(chains);
    console.log(channelRef.current);
    if (channelRef.current) {
      await channelRef.current.send({
        type: "broadcast",
        event: "review_started",
        payload: {
          chains,
        },
      });
    }
  };

  useEffect(() => {
    if (currentGame && currentGame.is_review) {
      getReview();
    }
  }, [currentGame]);

  const countdownComplete = async () => {
    if (!currentGame || members.length === 0) return;

    const now = new Date().toISOString();
    const { data: newRound, error: roundError } = await supabase
      .from("mermurs_rounds")
      .insert([
        {
          game_id: currentGame.id,
          round_number: 1,
          start_time: now,
        },
      ])
      .select()
      .single();

    if (roundError || !newRound) {
      toast.error("Failed to create Round 1.");
      return;
    }

    const shuffledMembers = [...members].sort(() => Math.random() - 0.5);

    const shuffledPhrases = [...STARTING_PHRASE].sort(
      () => Math.random() - 0.5
    );

    const phrasesToInsert = shuffledMembers.map((member, index) => {
      const phrase = shuffledPhrases[index % STARTING_PHRASE.length];
      return {
        game_id: currentGame.id,
        round_number: 1,
        round_id: newRound.id,
        player_id: member.uuid,
        text: phrase.text,
        audio: phrase.audio,
      };
    });

    console.log(phrasesToInsert);

    const { error: phraseError } = await supabase
      .from("mermurs_phrases")
      .insert(phrasesToInsert);

    if (phraseError) {
      toast.error("Failed to assign phrases.");
      return;
    }

    toast.success("Round 1 created and phrases assigned.");
    setRounds([newRound]);
    setIsProcessing(false);
    setLastUsedLanguage("english");
    setCompletedRecordings(new Set());
    await updateGameStatus("in_progress");
    setStartCountdown(false);
  };

  const updateWaiting = async () => {
    await resetRounds();
    await updateGameStatus("waiting");
  };

  useEffect(() => {
    setHasCreatedRound(false);
  }, [startTimeFromSupabase]);

  return (
    <ProtectedAdminRoute>
      <div className="p-6 space-y-6">
        {startCountdown && <Countdown onComplete={countdownComplete} />}

        <h1 className="text-2xl font-bold">Admin Lobby: {lobbyId}</h1>
        <div className="w-10 h-10 rounded-full border-2 border-white flex justify-center items-center fixed top-2.5 right-2.5">
          {startTimeFromSupabase && timerRemaining !== null && (
            <CountdownTimer
              key={startTimeFromSupabase}
              duration={ROUND_TIMER}
              startTime={Date.parse(startTimeFromSupabase)}
              size={24}
              onComplete={async () => {
                if (!hasCreatedRound) {
                  setHasCreatedRound(true);
                  if (!manualMode) {
                    await handleCreateRound(false);
                  } else {
                    toast.success("ROUND COMPLETE!", { duration: 2000 });
                  }
                }
              }}
            />
          )}
        </div>
        {!currentGame ? (
          <Button onClick={createGame}>Create New Game</Button>
        ) : (
          <>
            <Card>
              <CardContent className="p-4 space-y-2">
                <div>
                  <strong>Game ID:</strong> {currentGame.id}
                </div>
                <div>
                  <strong>Status:</strong> {currentGame.status}
                </div>
                <div>
                  <strong>Rounds:</strong> {rounds.length}{" "}
                  {currentGame.is_review && "(LAST)"}
                </div>
                <div>
                  <strong>Number of Players:</strong> {members.length}
                </div>
              </CardContent>
            </Card>

            <div className="space-x-4">
              <Button onClick={updateWaiting}>Set Waiting</Button>
              <Button onClick={startGame} disabled={members.length < 2}>
                Start Game
              </Button>
              <Button
                onClick={() => handleCreateRound(false)}
                disabled={
                  currentGame.status !== "in_progress" ||
                  currentGame.is_review ||
                  isProcessing
                }
              >
                Next Round
              </Button>
              <Button
                onClick={() => handleCreateRound(true)}
                disabled={
                  currentGame.status !== "in_progress" ||
                  currentGame.is_review ||
                  !manualMode
                }
                variant="secondary"
              >
                Review Game
              </Button>

              <Button onClick={endGame} variant="destructive">
                Kill Game
              </Button>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Manual Mode</label>
                <input
                  type="checkbox"
                  checked={manualMode}
                  onChange={() => setManualMode(!manualMode)}
                  className="toggle"
                />
              </div>
            </div>
          </>
        )}

        {reviewPhrases && reviewPhrases?.length > 0 && (
          <ReviewAlbumPage
            chains={reviewPhrases}
            lobbyId={lobbyId}
            isAdmin={true}
          />
        )}

        <div className="mt-6">
          <h2 className="text-xl font-semibold">Subscribed Members:</h2>
          <ul className="list-disc list-inside space-y-2">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between">
                <div>
                  {member.name}
                  {completedRecordings.has(member.uuid) && (
                    <span className="ml-2 text-green-500 font-semibold">
                      ✅ Done!
                    </span>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => kickMember(member.id)}
                >
                  Kick
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ProtectedAdminRoute>
  );
}
