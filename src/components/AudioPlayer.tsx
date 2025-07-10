"use client";

import { useRef } from "react";
import ReactAudioPlayer from "react-audio-player";
import { Button } from "@/components/ui/button";
import { PauseCircle, PlayCircle, StopCircle } from "lucide-react";

type CustomAudioPlayerProps = {
  url: string;
};

export default function CustomAudioPlayer({ url }: CustomAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = () => {
    audioRef.current?.play();
  };

  const handlePause = () => {
    audioRef.current?.pause();
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  let playerSrc = url;
  if (!playerSrc.startsWith("https://")) {
    playerSrc = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/syai-mermurs/${playerSrc}`;
  }
  console.log(playerSrc);

  return (
    <div className="bg-white/10 rounded-lg p-4 max-w-md mx-auto text-white space-y-2">
      <ReactAudioPlayer
        src={playerSrc}
        controls={false}
        ref={(el) => {
          // safely cast the inner audio element
          audioRef.current = el?.audioEl?.current || null;
        }}
      />
      <div className="flex justify-center gap-4">
        <Button onClick={handlePlay}>
          <PlayCircle /> Play
        </Button>
        <Button onClick={handlePause}>
          <PauseCircle /> Pause
        </Button>
        <Button onClick={handleStop}>
          <StopCircle /> Stop
        </Button>
      </div>
    </div>
  );
}
