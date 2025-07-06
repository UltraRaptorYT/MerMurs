"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import InstructionButton from "@/components/InstructionButton";
import ProfilePictureSelector from "@/components/ProfilePictureSelector";
import Image from "next/image";
import { FaPlay } from "react-icons/fa6";

export default function GameJoinOnlyPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const searchParams = useSearchParams();

  const redirectLobby = searchParams.get("redirect");

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [lobbyExists, setLobbyExists] = useState<boolean | null>(null); // null: loading, false: invalid, true: valid

  // Check if lobby exists on initial load
  useEffect(() => {
    const checkLobby = async () => {
      if (!redirectLobby) {
        toast.error("No lobby code provided.");
        router.push("/");
        return;
      }

      const { data, error } = await supabase
        .from("mermurs_lobby")
        .select("*")
        .eq("lobby_code", redirectLobby.trim())
        .single();

      if (error || !data) {
        toast.error("Lobby not found.");
        router.push("/");
        return;
      }

      if (data.status !== "waiting") {
        toast.error("The game has already started or ended.");
        router.push("/");
        return;
      }

      setLobbyExists(true);
    };

    checkLobby();
  }, [redirectLobby, router, supabase]);

  const handleJoin = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    setLoading(true);

    const playerUUID = uuidv4();
    const profilePicture = localStorage.getItem("profilePicture");

    const { error: insertError } = await supabase
      .from("mermurs_players")
      .insert([
        {
          id: playerUUID,
          lobby_code: redirectLobby!.trim(),
          player_name: name.trim(),
          image: profilePicture,
        },
      ]);

    if (insertError) {
      toast.error("Name already taken in this lobby.");
      setLoading(false);
      return;
    }

    sessionStorage.setItem("playerUUID", playerUUID);
    sessionStorage.setItem("playerName", name.trim());

    router.push(`/game/${redirectLobby!.trim()}`);
  };

  if (lobbyExists === null) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Checking Lobby...</h1>
      </div>
    );
  }

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
        <p className="text-xl font-semibold text-center">Ready to Join?</p>

        <ProfilePictureSelector />

        <Input
          placeholder="CoolNickName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-white dark:bg-white/20 focus:dark:bg-white/25 dark:placeholder-gray-100 border-2 border-white placeholder:font-semibold text-xl md:text-xl font-semibold text-center focus:ring-gray-100 focus-visible:ring-gray-100 focus-visible:outline-none focus-visible:border-0"
        />
      </div>
      <Button
        onClick={handleJoin}
        disabled={loading}
        className="justify-self-end text-base mb-5 font-bold"
        size={"lg"}
      >
        {loading ? (
          <span>Joining...</span>
        ) : (
          <div className="flex items-center justify-between gap-2.5">
            <FaPlay />
            <span>JOIN</span>
          </div>
        )}
      </Button>
    </div>
  );
}
