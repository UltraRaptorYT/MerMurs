"use client";
import { useEffect, useState, useRef } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { RealtimeChannel } from "@supabase/supabase-js";
import ReviewAlbumDisplay from "./ReviewAlbumDisplay";
import ReviewControls from "./ReviewControls";
import { Phrase } from "@/types";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReviewAlbumPage({
  chains,
  lobbyId,
  isAdmin = false,
}: {
  chains: Phrase[][];
  lobbyId: string;
  isAdmin?: boolean;
}) {
  const [startReview, setStartReview] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const supabase = createSupabaseClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`review-lobby:${lobbyId}`);

    channel
      .on("broadcast", { event: "start_review" }, () => {
        setStartReview(true);
        setCurrentStep(0);
      })
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

  const broadcastStartReview = () => {
    setStartReview(true);
    setCurrentStep(0);
    channelRef.current?.send({
      type: "broadcast",
      event: "start_review",
      payload: {},
    });
  };

  return (
    <div className="grow flex flex-col max-h-[85dvh]">
      {!startReview ? (
        <>
          <h1 className="text-2xl font-bold mb-4 text-center">
            MerMurs Review
          </h1>
          <div className="flex flex-col gap-5 items-center justify-center grow">
            <div className="flex flex-col items-center space-y-4 opacity-75  max-w-42">
              <p className="text-white text-sm text-center font-semibold">
                WAITING FOR THE HOST TO START THE REVIEW ;)
              </p>
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
            {isAdmin && (
              <Button onClick={broadcastStartReview}>Start Review</Button>
            )}
          </div>
        </>
      ) : (
        <>
          {isAdmin && (
            <ReviewControls
              currentStep={currentStep}
              maxSteps={chains.length}
              onNext={() => updateStep(currentStep + 1)}
              onPrev={() => updateStep(currentStep - 1)}
            />
          )}
          <ReviewAlbumDisplay chain={chains[currentStep]} />
        </>
      )}
    </div>
  );
}
