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

export default function GameLobbyPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();
  const params = useParams();
  const { lobbyId } = params as { lobbyId: string };

  const [playerUUID, setPlayerUUID] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerImage, setPlayerImage] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [lobbyExists, setLobbyExists] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [roomStatus, setRoomStatus] = useState("");
  const [round, setRound] = useState<number>(0);

  useEffect(() => {
    const storedName = sessionStorage.getItem("playerName");
    const storedUUID = sessionStorage.getItem("playerUUID");
    const profilePicture = sessionStorage.getItem("profilePicture");

    if (!storedName || !storedUUID || !profilePicture) {
      router.push(`/join?redirect=${lobbyId}`);
    } else {
      setPlayerName(storedName);
      setPlayerUUID(storedUUID);
      setPlayerImage(profilePicture);
    }
  }, [lobbyId, router]);

  useEffect(() => {
    const checkLobby = async () => {
      const { data, error } = await supabase
        .from("mermurs_lobby")
        .select("*")
        .eq("lobby_code", lobbyId)
        .single();

      if (error || !data) {
        toast.error("Lobby not found. Please check the code.");
        router.push("/");
      } else if (data.status !== "waiting") {
        toast.error("The game has already started or ended.");
        router.push("/");
      } else {
        setRoomStatus(data.status);
        setRound(data.round);
        setLobbyExists(true);
      }
    };

    if (playerName) {
      checkLobby();
    }
  }, [playerName, lobbyId, router, supabase]);

  useEffect(() => {
    if (!playerName || !lobbyExists) return;

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
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mermurs_lobby",
          filter: `lobby_code=eq.${lobbyId}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          const newRound = payload.new.round;
          setRoomStatus(newStatus);
          setRound(newRound);
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
  }, [playerName, lobbyId, lobbyExists]);

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
    router.push("/");
    if (messageType === "success") {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  if (!playerName || !lobbyExists) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="px-6 pt-1 space-y-6 grow flex flex-col">
      <PlayerScrollBar members={members} />
      <Instructions />
      <h3 className="text-lg font-semibold">
        Current Room Status: {roomStatus}
      </h3>
      <h3 className="text-lg font-semibold">Current Round: {round}</h3>
      {/*

      <h1 className="text-2xl font-bold">Lobby: {lobbyId}</h1>
      <h2 className="text-lg">Welcome, {playerName}</h2>

      <Card>
        <CardContent className="p-4 space-y-2">
          <h3 className="text-xl font-semibold">Players in Lobby:</h3>
          <ul className="list-disc list-inside">
            {members.map((member) => (
              <li key={member.id}>{member.name}</li>
            ))}
          </ul>
        </CardContent>
      </Card> */}

      <Button
        onClick={() => handleLeaveGame()}
        className="mt-4"
        variant="destructive"
      >
        Leave Game
      </Button>
    </div>
  );
}
