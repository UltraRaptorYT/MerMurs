"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Member } from "@/types";
import PlayerScrollBar from "@/components/PlayerScrollBar";
import Instructions from "@/components/Instructions";
import { Loader2 } from "lucide-react";
import Countdown from "@/components/Countdown";
import Image from "next/image";
import CountdownTimer from "@/components/CountdownTimer";
import { ROUND_TIMER } from "@/contants";
import CustomAudioPlayer from "@/components/AudioPlayer";
import Recorder from "@/components/Recorder";

export default function GameLobbyPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();
  const params = useParams();
  const { lobbyId } = params as { lobbyId: string };

  const [playerUUID, setPlayerUUID] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerImage, setPlayerImage] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [gameId, setGameId] = useState<string | null>(null);
  const [round, setRound] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<string>("");
  const [gameInProgress, setGameInProgress] = useState(false);
  const [lobbyValid, setLobbyValid] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [countdownDone, setCountdownDone] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [startTimeFromSupabase, setStartTimeFromSupabase] = useState<
    string | null
  >(null);
  const [isLastRound, setIsLastRound] = useState(false);
  const [assignedPhrase, setAssignedPhrase] = useState<{
    id: string;
    text: string;
    audio: string;
    assist_text: string;
    round_id: string;
  } | null>(null);

  useEffect(() => {
    const storedName = sessionStorage.getItem("playerName");
    const storedUUID = sessionStorage.getItem("playerUUID");
    const profilePicture = sessionStorage.getItem("profilePicture");
    const storedGameId = sessionStorage.getItem("gameId");

    if (!storedName || !storedUUID || !profilePicture || !storedGameId) {
      router.push(`/join?redirect=${lobbyId}`);
    } else {
      setPlayerName(storedName);
      setPlayerUUID(storedUUID);
      setPlayerImage(profilePicture);
      setGameId(storedGameId);
    }
  }, [lobbyId, router]);

  useEffect(() => {
    const fetchGameStatus = async () => {
      if (!gameId) return;

      const { data: game, error: gameError } = await supabase
        .from("mermurs_games")
        .select("status, is_last_round")
        .eq("id", gameId)
        .single();

      if (gameError || !game) {
        toast.error("Game not found or has ended.");
        router.push("/");
        return;
      }

      setGameStatus(game.status);
      setIsLastRound(game.is_last_round ?? false);
      setGameInProgress(
        game.status === "start_game" || game.status === "in_progress"
      );
      setLobbyValid(true);

      // Fetch latest round
      const { data: rounds } = await supabase
        .from("mermurs_rounds")
        .select("round_number")
        .eq("game_id", gameId)
        .order("round_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      setRound(rounds?.round_number ?? 0);
    };

    if (playerName && gameId) {
      fetchGameStatus();
    }
  }, [playerName, gameId, supabase, router]);

  useEffect(() => {
    setCountdownDone(false);
    setAssignedPhrase(null);
    setRound(0);
  }, [gameId]);

  useEffect(() => {
    if (!playerName || !lobbyValid) return;

    const channel = supabase
      .channel(`presence-lobby:${lobbyId}`, {
        config: { presence: { key: playerName } },
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
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
      .on("broadcast", { event: "kick" }, (payload) => {
        const { kickedMember } = payload.payload;
        if (kickedMember === playerName) {
          handleLeaveGame("You have been kicked from the lobby.", "error");
        }
      })
      .on("broadcast", { event: "newGame" }, (payload) => {
        const { game_data } = payload.payload;
        sessionStorage.setItem("gameId", game_data.id);
        setGameId(game_data.id);
      })
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mermurs_games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const updatedStatus = payload.new.status;
          setCountdownDone(false);
          setGameStatus(updatedStatus);
          setGameInProgress(
            updatedStatus === "start_game" || updatedStatus === "in_progress"
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mermurs_rounds",
          filter: `game_id=eq.${gameId}`,
        },
        async (payload) => {
          try {
            switch (payload.eventType) {
              case "INSERT":
              case "UPDATE":
                if (payload.new?.round_number !== undefined) {
                  setRound(payload.new.round_number);

                  const { data: phraseRow, error: phraseError } = await supabase
                    .from("mermurs_phrases")
                    .select("id,text,audio,assist_text")
                    .eq("player_id", playerUUID)
                    .eq("round_id", payload.new.id)
                    .maybeSingle();

                  if (!phraseError && phraseRow) {
                    setAssignedPhrase({
                      id: phraseRow.id,
                      text: phraseRow.text,
                      audio: phraseRow.audio,
                      assist_text: phraseRow.assist_text,
                      round_id: payload.new.id,
                    });
                  } else {
                    setAssignedPhrase(null);
                  }
                }
                if (payload.new?.start_time) {
                  const startTime = new Date(payload.new.start_time).getTime();
                  const now = Date.now();
                  const elapsed = (now - startTime) / 1000;
                  const remaining = Math.max(ROUND_TIMER - elapsed, 0);

                  setStartTimeFromSupabase(payload.new.start_time); // ✅ Save it here
                  setTimerRemaining(remaining);
                }

                break;

              case "DELETE":
                const { data: latest, error } = await supabase
                  .from("mermurs_rounds")
                  .select("round_number")
                  .eq("game_id", gameId)
                  .order("round_number", { ascending: false })
                  .limit(1)
                  .maybeSingle();

                if (error) {
                  console.error(
                    "Error fetching latest round after delete:",
                    error
                  );
                  toast.error("Failed to update round after deletion.");
                  return;
                }

                setRound(latest?.round_number ?? 0);
                break;

              default:
                console.warn("Unhandled postgres event:", payload);
            }
          } catch (err) {
            console.error("Error processing postgres change event:", err);
            toast.error("Something went wrong with round updates.");
          }
        }
      )

      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await channel.track({
          name: playerName,
          uuid: playerUUID,
          image: playerImage,
        });
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        const chan = channelRef.current;
        chan.unsubscribe();
        supabase.removeChannel(chan);
      }
    };
  }, [playerName, lobbyId, lobbyValid, gameId]);

  const handleLeaveGame = async (
    message: string = "You have left the game.",
    messageType: "success" | "error" = "success"
  ) => {
    const playerUUID = sessionStorage.getItem("playerUUID");

    if (playerUUID) {
      await supabase.from("mermurs_players").delete().eq("id", playerUUID);
    }

    if (channelRef.current) {
      await channelRef.current.unsubscribe();
      supabase.removeChannel(channelRef.current);
    }

    sessionStorage.removeItem("playerName");
    sessionStorage.removeItem("playerUUID");
    sessionStorage.removeItem("gameId");

    router.push("/");
    if (messageType === "success") {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  if (!playerName || !lobbyValid) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="px-6 pt-1 pb-3 space-y-6 grow flex flex-col relative max-w-md mx-auto">
      {gameStatus === "start_game" && !countdownDone && (
        <Countdown onComplete={() => setCountdownDone(true)} />
      )}
      {!gameInProgress ||
      round === 0 ||
      (gameStatus === "start_game" && !countdownDone) ? (
        <>
          {/* Always show these during waiting AND countdown */}
          <PlayerScrollBar members={members} uuid={playerUUID} />
          <Instructions />
          <div className="flex items-center space-x-4 opacity-75">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <p className="text-white text-sm text-center font-semibold">
              WAITING FOR THE HOST TO SET UP AND TO START THE GAME ;)
            </p>
          </div>
          <Button
            onClick={() => handleLeaveGame()}
            variant="destructive"
            className="mt-auto"
          >
            Leave Game
          </Button>
        </>
      ) : (
        <>
          {/* Game has started & countdown is done */}
          <div className="flex items-center justify-between fixed top-2.5 px-2.5 left-0 right-0 w-full">
            <p className="bg-white text-black rounded-lg py-2 px-2.5 font-semibold">
              Round: {round}
            </p>
            <div className="w-10 h-10 rounded-full border-2 border-white flex justify-center items-center">
              {timerRemaining !== null && startTimeFromSupabase && (
                <CountdownTimer
                  duration={timerRemaining}
                  startTime={Date.parse(startTimeFromSupabase)} // ✅ Now it's defined
                  size={24}
                  onComplete={() => console.log("Done!")}
                />
              )}
            </div>
          </div>
          <div className="flex justify-center relative">
            <Image
              src={"/MERMURS.png"}
              width={90}
              height={90}
              alt={"MerMurs Logo"}
              className="mx-auto m-5"
            />
          </div>
          <p>{assignedPhrase && assignedPhrase.text}</p>
          <p>{assignedPhrase && assignedPhrase.assist_text}</p>
          {assignedPhrase && <CustomAudioPlayer url={assignedPhrase.audio} />}
          {assignedPhrase && (
            <Recorder
              key={assignedPhrase.audio}
              playerId={playerUUID}
              phraseId={assignedPhrase.id}
              roundId={assignedPhrase.round_id}
              channel={channelRef.current}
              gameId={gameId || ""}
            />
          )}
          {isLastRound && "LAST ROUND!"}
        </>
      )}
    </div>
  );
}
