"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createSupabaseClient } from "@/lib/supabaseClient";
import ProtectedAdminRoute from "@/components/ProtectedAdminRoute";
import { Lobby } from "@/types";

export default function AdminPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();

  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [lobbyCode, setLobbyCode] = useState("");
  const [chainLength, setChainLength] = useState<number>(6);

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

  const createLobby = async () => {
    if (!lobbyCode.trim()) {
      toast.error("Please enter a lobby code.");
      return;
    }

    const { error } = await supabase
      .from("mermurs_lobby")
      .insert([{ lobby_code: lobbyCode.trim(), chain_length: chainLength }]);

    if (error) {
      console.error("Error creating lobby:", error);
    } else {
      setLobbyCode("");
      setChainLength(10);
      toast.success("Lobby created successfully.");
    }
  };

  // Delete lobby function
  const deleteLobby = async (lobbyId: string) => {
    const { error } = await supabase
      .from("mermurs_lobby")
      .delete()
      .eq("id", lobbyId);

    if (error) {
      console.error("Error deleting lobby:", error);
      toast.error("Failed to delete lobby.");
    } else {
      toast.success("Lobby deleted successfully.");
      fetchLobbies(); // Optional: to refresh immediately, though real-time will also update.
    }
  };

  // const updateLobby = async (
  //   lobbyId: string,
  //   status: string,
  //   chainLength: number
  // ) => {
  //   const { error } = await supabase
  //     .from("mermurs_lobby")
  //     .update({ status, chain_length: chainLength })
  //     .eq("id", lobbyId);

  //   if (error) {
  //     console.error("Error updating lobby:", error);
  //     toast.error("Failed to update lobby.");
  //   } else {
  //     toast.success("Lobby updated successfully.");
  //   }
  // };

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
    <ProtectedAdminRoute>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Admin Lobby Page</h1>
        <div className="space-y-4">
          <Input
            placeholder="Enter Lobby Code"
            value={lobbyCode}
            onChange={(e) => setLobbyCode(e.target.value)}
          />
          <Input
            type="text"
            pattern="/d+"
            placeholder="Max Players"
            value={chainLength}
            onChange={(e) => setChainLength(Number(e.target.value))}
          />
          <Button onClick={createLobby}>Create New Lobby</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lobbies.map((lobby) => (
            <Card
              key={lobby.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
            >
              <CardContent
                onClick={() => router.push(`/admin/${lobby.lobby_code}`)}
                className="p-4 space-y-2"
              >
                <div>
                  <strong>Lobby Code:</strong> {lobby.lobby_code}
                </div>
                <div>
                  <strong>Status:</strong> {lobby.status}
                </div>
                <div>
                  <strong>Chain Length:</strong> {lobby.chain_length}
                </div>
                <div>
                  <strong>Created At:</strong>{" "}
                  {new Date(lobby.created_at).toLocaleString()}
                </div>
              </CardContent>
              <div className="flex justify-end p-2">
                <Button
                  variant="destructive"
                  onClick={() => deleteLobby(lobby.id)}
                >
                  Delete Lobby
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </ProtectedAdminRoute>
  );
}
