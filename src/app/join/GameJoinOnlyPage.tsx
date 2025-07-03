"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { toast } from "sonner";

export default function GameJoinOnlyPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const searchParams = useSearchParams();

  const redirectLobby = searchParams.get("redirect");

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if redirectLobby exists on initial load
  useEffect(() => {
    if (!redirectLobby) {
      toast.error("No lobby to redirect to.");
      router.push("/");
    }
  }, [redirectLobby, router]);

  const handleJoin = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("mermurs_lobby")
      .select("*")
      .eq("lobby_code", redirectLobby!.trim())
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
    router.push(`/game/${redirectLobby!.trim()}`);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Enter Your Name</h1>
      <Input
        placeholder="Your Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Button onClick={handleJoin} disabled={loading}>
        {loading ? "Joining..." : "Join Lobby"}
      </Button>
    </div>
  );
}
