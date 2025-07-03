"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { RealtimeChannel } from "@supabase/supabase-js";
import ProtectedAdminRoute from "@/components/ProtectedAdminRoute";

interface Lobby {
  id: string;
  lobby_code: string;
  status: string;
  max_players: number;
  created_at: string;
  updated_at: string;
}

interface Member {
  id: string;
  name: string;
  uuid: string;
}

export default function AdminLobbyPage() {
  const supabase = createSupabaseClient();
  const params = useParams();
  const { lobbyId } = params as { lobbyId: string };

  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchLobby = async () => {
    const { data, error } = await supabase
      .from("mermurs_lobby")
      .select("*")
      .eq("lobby_code", lobbyId)
      .single();

    if (error) {
      console.error("Error fetching lobby:", error);
    } else {
      setLobby(data);
    }
  };

  const updateStatus = async (newStatus: string) => {
    const { error } = await supabase
      .from("mermurs_lobby")
      .update({ status: newStatus })
      .eq("lobby_code", lobbyId);

    if (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status.");
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

  useEffect(() => {
    fetchLobby();

    const channel = supabase
      .channel(`presence-lobby:${lobbyId}`, {
        config: { presence: { key: `admin-${lobbyId}` } },
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
            };
          })
        );
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
      });

    channelRef.current = channel;

    const lobbyChannel = supabase
      .channel(`lobby-${lobbyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mermurs_lobby",
          filter: `lobby_code=eq.${lobbyId}`,
        },
        () => {
          fetchLobby();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        const chan = channelRef.current;
        chan.unsubscribe();
        supabase.removeChannel(chan);
      }
      supabase.removeChannel(lobbyChannel);
    };
  }, [lobbyId]);

  if (!lobby) {
    return <div className="p-6">Loading lobby...</div>;
  }

  return (
    <ProtectedAdminRoute>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Admin Lobby: {lobby.lobby_code}</h1>
        <Card>
          <CardContent className="p-4 space-y-2">
            <div>
              <strong>Lobby Code:</strong> {lobby.lobby_code}
            </div>
            <div>
              <strong>Status:</strong> {lobby.status}
            </div>
            <div>
              <strong>Max Players:</strong> {lobby.max_players}
            </div>
            <div>
              <strong>Created At:</strong>{" "}
              {new Date(lobby.created_at).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <div className="space-x-4">
          <Button onClick={() => updateStatus("waiting")}>Set Waiting</Button>
          <Button onClick={() => updateStatus("in_progress")}>
            Set In Progress
          </Button>
          <Button onClick={() => updateStatus("ended")}>Set Ended</Button>
        </div>
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
