import { useEffect, useRef, useState } from "react";
import CustomAudioPlayer from "@/components/AudioPlayer";
import { Phrase } from "@/types";
import Image from "next/image";
import ProfilePictureDisplay from "../ProfilePictureDisplay";

export default function ReviewAlbumDisplay({ chain }: { chain: Phrase[] }) {
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [showRecorded, setShowRecorded] = useState(false);
  const [showTypingMerMur, setShowTypingMerMur] = useState(true);
  const [showTypingPlayer, setShowTypingPlayer] = useState(false);
  const latestItemRef = useRef<HTMLDivElement | null>(null); // 👈 ref for scrolling

  useEffect(() => {
    setVisibleIndex(0);
    setShowRecorded(false);
    setShowTypingMerMur(true);
    setShowTypingPlayer(false);
  }, [chain]);

  useEffect(() => {
    // scroll smoothly to the most recent item
    latestItemRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [visibleIndex, showRecorded]);

  // Typing before MerMur
  useEffect(() => {
    if (showTypingMerMur) {
      const timer = setTimeout(() => setShowTypingMerMur(false), 600);
      return () => {
        latestItemRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        clearTimeout(timer);
      };
    }
  }, [showTypingMerMur]);

  // Typing before Player
  useEffect(() => {
    if (showTypingPlayer) {
      const timer = setTimeout(() => setShowTypingPlayer(false), 600);
      return () => {
        latestItemRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        clearTimeout(timer);
      };
    }
  }, [showTypingPlayer]);

  const currentPlayer = chain[0]?.mermurs_players?.player_name || "Player";

  return (
    <>
      <h1 className="text-2xl font-bold mb-4 text-center">
        {currentPlayer}'s Review
      </h1>
      <div className="space-y-4 overflow-auto  max-h-[calc(100dvh-180px)]">
        {chain.slice(0, visibleIndex + 1).map((p, index) => {
          const isLatest = index === visibleIndex;

          return (
            <div
              key={p.id}
              className="flex flex-col gap-2"
              ref={isLatest ? latestItemRef : null}
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center px-2 pt-5 relative">
                  <Image
                    src="/MERMURS.png"
                    width={50}
                    height={50}
                    alt="MerMurs Logo"
                  />
                  <span className="text-white text-xs font-bold text-center ">
                    MerMurs
                  </span>
                </div>
                <div className="bg-white text-black rounded-md p-3">
                  {isLatest && !showRecorded && showTypingMerMur ? (
                    <p className="italic animate-pulse">Typing...</p>
                  ) : (
                    <>
                      <p>{p.text}</p>
                      {p.translated_text && (
                        <p className="text-sm text-gray-600">
                          💬 {p.translated_text}
                        </p>
                      )}
                      {isLatest ? (
                        <CustomAudioPlayer
                          url={p.audio}
                          autoplay={!showTypingMerMur}
                          onEnded={() => {
                            setShowRecorded(true);
                            setShowTypingPlayer(true); // 👈 start next Typing...
                          }}
                        />
                      ) : (
                        index < visibleIndex && (
                          <CustomAudioPlayer url={p.audio} autoplay={false} />
                        )
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Step 2: Recorded response with avatar */}
              {p.recorded_audio_url &&
                (index < visibleIndex || showRecorded) && (
                  <div className="flex flex-row-reverse items-center gap-4">
                    <div
                      key={p.mermurs_players.id}
                      className="flex flex-col items-center px-2 pt-5 relative"
                    >
                      <ProfilePictureDisplay
                        imageSrc={p.mermurs_players.image}
                        width={50}
                        alt={`${p.mermurs_players.player_name} PFP`}
                        className="w-full"
                      />
                      <span className="text-white text-xs font-bold text-ellipsis text-center overflow-hidden w-12">
                        {p.mermurs_players.player_name}
                      </span>
                    </div>
                    <div className="bg-white text-black rounded-md p-3">
                      {isLatest && showRecorded && showTypingPlayer ? (
                        <p className="italic animate-pulse">Typing...</p>
                      ) : (
                        <CustomAudioPlayer
                          url={p.recorded_audio_url}
                          autoplay={isLatest && !showTypingPlayer}
                          onEnded={() => {
                            setVisibleIndex((prev) => prev + 1);
                            setShowRecorded(false);
                            setShowTypingMerMur(true); // 👈 for next MerMur
                            setShowTypingPlayer(false);
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
            </div>
          );
        })}
      </div>
    </>
  );
}
