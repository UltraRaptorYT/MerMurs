"use client";

import { useEffect, useRef, useState } from "react";
import ReactAudioPlayer from "react-audio-player";
import { Button } from "@/components/ui/button";
import { Download, PlayCircle, StopCircle } from "lucide-react";
import DownloadButton from "@/components/DownloadButton";

type CustomAudioPlayerProps = {
  url: string;
  autoplay?: boolean;
  onEnded?: (e: Event) => void;
  download?: boolean;
};

export default function CustomAudioPlayer({
  url,
  autoplay = false,
  onEnded,
  download = false,
}: CustomAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const handlePlay = () => {
    audioRef.current?.play();
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    }
  };

  useEffect(() => {
    if (autoplay && audioRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setPlaying(true))
          .catch((err) => {
            console.warn("Autoplay failed:", err);
          });
      }
    }
  }, [autoplay]);

  let playerSrc = url;
  if (playerSrc && !playerSrc.startsWith("https://")) {
    playerSrc = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/syai-mermurs/${playerSrc}`;
  }

  return (
    <div className="bg-white/10 rounded-lg p-4 max-w-md mx-auto text-white space-y-2">
      <ReactAudioPlayer
        src={playerSrc}
        controls={false}
        autoPlay={autoplay}
        ref={(el) => {
          audioRef.current = el?.audioEl?.current || null;
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={(e) => {
          setPlaying(false);
          onEnded?.(e);
        }}
      />
      <div className="flex justify-center gap-4">
        <Button onClick={handlePlay}>
          <PlayCircle /> {playing ? "Playing" : "Play"}
        </Button>
        <Button onClick={handleStop}>
          <StopCircle /> Stop
        </Button>
        {download && (
          <DownloadButton fileUrl={url}>
            <Download />
          </DownloadButton>
        )}
      </div>
    </div>
  );
}
