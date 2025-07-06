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

  const handleEnterLobby = async () => {
    if (!lobbyCode.trim()) {
      toast.error("Please enter the lobby code.");
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

    // If lobby is valid and waiting, proceed to join page
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
      <div className="glassy p-6 w-full max-w-xl flex flex-col items-center space-y-6 mb-10">
        <p className="text-xl font-semibold text-center">Welcome to MerMurs!</p>

        <ProfilePictureSelector />

        <Input
          placeholder="Lobby Code"
          value={lobbyCode}
          onChange={(e) => setLobbyCode(e.target.value)}
          className="w-full bg-white dark:bg-white/20 focus:dark:bg-white/25 dark:placeholder-gray-100 border-2 border-white placeholder:font-semibold text-xl md:text-xl font-semibold text-center focus:ring-gray-100 focus-visible:ring-gray-100 focus-visible:outline-none focus-visible:border-0"
        />
      </div>

      <Button
        onClick={handleEnterLobby}
        disabled={loading}
        className="justify-self-end text-base mb-5 font-bold"
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
    </div>
  );
}
