"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { toast } from "sonner";

export default function GameJoinPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const searchParams = useSearchParams();

  const redirectLobby = searchParams.get("redirect");

  const [name, setName] = useState("");
  const [lobbyCode, setLobbyCode] = useState(redirectLobby || "");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!name.trim() || !lobbyCode.trim()) {
      toast.error("Please enter both name and lobby code.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("mermurs_lobby")
      .select("*")
      .eq("lobby_code", lobbyCode.trim())
      .single();

    if (error || !data) {
      toast.error("Lobby not found. Please check the code.");
      setLoading(false);
      return;
    }

    if (data.status !== "waiting") {
      toast.error("The game has already started or ended.");
      setLoading(false);
      return;
    }

    localStorage.setItem("playerName", name.trim());
    router.push(`/game/${lobbyCode.trim()}`);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Join Game</h1>
      <Input
        placeholder="Enter Your Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        placeholder="Enter Lobby Code"
        value={lobbyCode}
        onChange={(e) => setLobbyCode(e.target.value)}
      />
      <Button onClick={handleJoin} disabled={loading}>
        {loading ? "Joining..." : "Join Lobby"}
      </Button>
    </div>
  );
}
