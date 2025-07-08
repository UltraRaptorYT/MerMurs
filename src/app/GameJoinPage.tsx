"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createSupabaseClient } from "@/lib/supabaseClient";
import InstructionButton from "@/components/InstructionButton";
import Image from "next/image";
import { toast } from "sonner";
import ProfilePictureSelector from "@/components/ProfilePictureSelector";
import { FaPlay } from "react-icons/fa6";

export default function GameJoinPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [lobbyCode, setLobbyCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEnterLobby = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); // Prevent form default refresh behavior

    if (!lobbyCode.trim()) {
      toast.error("Please enter the lobby code.");
      return;
    }

    setLoading(true);

    // 1. Check if the lobby exists
    const { data: lobby, error: lobbyError } = await supabase
      .from("mermurs_lobby")
      .select("lobby_code")
      .eq("lobby_code", lobbyCode.trim())
      .single();

    if (lobbyError || !lobby) {
      toast.error("Lobby not found. Please check the code.");
      setLoading(false);
      return;
    }

    // 2. Check for an active game with status 'waiting'
    const { data: game, error: gameError } = await supabase
      .from("mermurs_games")
      .select("*")
      .eq("lobby_code", lobbyCode.trim())
      .eq("status", "waiting")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (gameError || !game) {
      toast.error("No joinable game found in this lobby.");
      setLoading(false);
      return;
    }

    // 3. All good, proceed
    router.push(`/join?redirect=${lobbyCode.trim()}`);
  };

  return (
    <div className="p-6 space-y-4 grow flex flex-col items-center justify-between">
      <InstructionButton />
      <Image
        src={"/MERMURS.png"}
        width={115}
        height={115}
        alt={"MerMurs Logo"}
        className="mx-auto"
      />
      <form onSubmit={handleEnterLobby} className="w-full grow justify-center items-center flex flex-col">
        <div className="glassy p-6 w-full max-w-xl flex flex-col items-center space-y-6 mb-10 my-auto">
          <p className="text-xl font-semibold text-center">
            Welcome to MerMurs!
          </p>
          <ProfilePictureSelector />
          <Input
            placeholder="Lobby Code"
            value={lobbyCode}
            onChange={(e) => setLobbyCode(e.target.value)}
            className="w-full bg-white dark:bg-white/20 focus:dark:bg-white/25 dark:placeholder-gray-100 border-2 border-white placeholder:font-semibold text-xl md:text-xl font-semibold text-center focus:ring-gray-100 focus-visible:ring-gray-100 focus-visible:outline-none focus-visible:border-0"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="justify-self-end text-base font-bold mt-auto"
          size={"lg"}
        >
          {loading ? (
            <span>Checking...</span>
          ) : (
            <div className="flex items-center justify-between gap-2.5">
              <FaPlay />
              <span>START</span>
            </div>
          )}
        </Button>
      </form>
    </div>
  );
}
