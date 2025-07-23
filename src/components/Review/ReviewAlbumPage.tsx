"use client";
import { useEffect, useState, useRef } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import ReviewAlbumDisplay from "./ReviewAlbumDisplay";
import ReviewControls from "./ReviewControls";
import { Phrase } from "@/types";

export default function ReviewAlbumPage({
  chains,
  lobbyId,
  isAdmin = false,
}: {
  chains: Phrase[][];
  lobbyId: string;
  isAdmin?: boolean;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const supabase = createSupabaseClient();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const channel = supabase.channel(`review-lobby:${lobbyId}`);

    channel
      .on("broadcast", { event: "review_step" }, ({ payload }) => {
        setCurrentStep(payload.step);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [lobbyId]);

  const updateStep = (step: number) => {
    setCurrentStep(step);
    channelRef.current?.send({
      type: "broadcast",
      event: "review_step",
      payload: { step },
    });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Album Review</h1>

      {isAdmin && (
        <ReviewControls
          currentStep={currentStep}
          maxSteps={chains.length}
          onNext={() => updateStep(currentStep + 1)}
          onPrev={() => updateStep(currentStep - 1)}
        />
      )}

      <ReviewAlbumDisplay chain={chains[currentStep]} />
    </div>
  );
}
