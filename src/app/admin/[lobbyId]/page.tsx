"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { RealtimeChannel } from "@supabase/supabase-js";
import ProtectedAdminRoute from "@/components/ProtectedAdminRoute";
import { Game, Member, Round } from "@/types";
import Countdown from "@/components/Countdown";
import CountdownTimer from "@/components/CountdownTimer";
import { ROUND_TIMER } from "@/contants";

export default function AdminLobbyPage() {
  const supabase = createSupabaseClient();
  const params = useParams();
  const { lobbyId } = params as { lobbyId: string };

  const [members, setMembers] = useState<Member[]>([]);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [startCountdown, setStartCountdown] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

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
    const { data, error } = await supabase
      .from("mermurs_games")
      .insert([{ lobby_code: lobbyId, status: "waiting" }])
      .select()
      .single();

    if (!error && data) {
      toast.success("New game created");
      setCurrentGame(data);
      setRounds([]);
    }
  };

  const createRound = async () => {
    if (!currentGame) return;
    const nextRoundNumber = rounds.length + 1;

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("mermurs_rounds")
      .insert([
        {
          game_id: currentGame.id,
          round_number: nextRoundNumber,
          start_time: now,
        },
      ])
      .select()
      .single();

    if (!error && data) {
      toast.success(`Round ${nextRoundNumber} created`);
      setRounds((prev) => [...prev, data]);
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
      .subscribe();

    channelRef.current = presenceChannel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [lobbyId]);

  const countdownComplete = async () => {
    if (!currentGame) return;

    const now = new Date().toISOString();

    const { data: newRound, error } = await supabase
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

    if (error) {
      toast.error("Failed to create Round 1.");
      return;
    }

    setRounds([newRound]);
    await updateGameStatus("in_progress");
    setStartCountdown(false);
  };

  const updateWaiting = async () => {
    await resetRounds();
    await updateGameStatus("waiting");
  };

  return (
    <ProtectedAdminRoute>
      <div className="p-6 space-y-6">
        {startCountdown && <Countdown onComplete={countdownComplete} />}

        <h1 className="text-2xl font-bold">Admin Lobby: {lobbyId}</h1>
        <div className="w-10 h-10 rounded-full border-2 border-white flex justify-center items-center fixed top-2.5 right-2.5">
          {/* {!startCountdown && roundStartTime && timerRemaining !== null && (
            <CountdownTimer
              key={roundStartTime}
              duration={timerRemaining}
              startTime={Date.parse(roundStartTime)}
              size={24}
              onComplete={() => console.log("Done!")}
            />
          )} */}
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
                  <strong>Rounds:</strong> {rounds.length}
                </div>
                <div>
                  <strong>Number of Players:</strong> {members.length}
                </div>
              </CardContent>
            </Card>

            <div className="space-x-4">
              <Button onClick={updateWaiting}>Set Waiting</Button>
              <Button onClick={startGame} disabled={members.length < 4}>
                Start Game
              </Button>
              <Button
                onClick={createRound}
                disabled={currentGame.status !== "in_progress"}
              >
                Next Round
              </Button>
              <Button onClick={endGame} variant="destructive">
                End Game
              </Button>
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-semibold">Rounds:</h2>
              <ul className="list-disc list-inside space-y-1">
                {rounds.map((round) => (
                  <li key={round.id}>Round {round.round_number}</li>
                ))}
              </ul>
            </div>
          </>
        )}

        <div className="mt-6">
          <h2 className="text-xl font-semibold">Subscribed Members:</h2>
          <ul className="list-disc list-inside space-y-2">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between">
                {member.name}
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
