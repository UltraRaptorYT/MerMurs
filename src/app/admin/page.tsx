"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createSupabaseClient } from "@/lib/supabaseClient";

interface Lobby {
  id: string;
  lobby_code: string;
  status: string;
  max_players: number;
  created_at: string;
  updated_at: string;
}

export default function AdminPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();

  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [lobbyCode, setLobbyCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState<number>(10);

  // Fetch all lobbies initially
  const fetchLobbies = async () => {
    const { data, error } = await supabase
      .from("mermurs_lobby")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error fetching lobbies:", error);
    } else {
      setLobbies(data);
    }
  };

  // Create a new lobby
  const createLobby = async () => {
    if (!lobbyCode.trim()) {
      toast.error("Please enter a lobby code.");
      return;
    }

    const { error } = await supabase
      .from("mermurs_lobby")
      .insert([{ lobby_code: lobbyCode.trim(), max_players: maxPlayers }]);

    if (error) {
      console.error("Error creating lobby:", error);
    } else {
      setLobbyCode("");
      setMaxPlayers(10);
    }
  };

  // Real-time subscription
  useEffect(() => {
    fetchLobbies();

    const channel = supabase
      .channel("lobbies")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mermurs_lobby" },
        () => {
          fetchLobbies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Lobby Page</h1>

      <div className="space-y-4">
        <Input
          placeholder="Enter Lobby Code"
          value={lobbyCode}
          onChange={(e) => setLobbyCode(e.target.value)}
        />
        <Input
          type="number"
          placeholder="Max Players"
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(Number(e.target.value))}
        />
        <Button onClick={createLobby}>Create New Lobby</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lobbies.map((lobby) => (
          <Card
            key={lobby.id}
            onClick={() => router.push(`/admin/${lobby.lobby_code}`)}
            className="cursor-pointer hover:shadow-lg transition-shadow"
          >
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
        ))}
      </div>
    </div>
  );
}
