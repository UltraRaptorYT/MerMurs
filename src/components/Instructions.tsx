"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { motion } from "framer-motion";

export default function ProgressDotCarousel() {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [snapPoints, setSnapPoints] = useState<number[]>([]);

  const [progress, setProgress] = useState(0);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Setup carousel API
  useEffect(() => {
    if (!api) return;

    setSnapPoints(api.scrollSnapList());
    setCurrentIndex(api.selectedScrollSnap());

    const onSelect = () => setCurrentIndex(api.selectedScrollSnap());
    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const startProgress = useCallback(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    setProgress(0);

    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (!api) return 0;
          api.scrollTo((currentIndex + 1) % snapPoints.length);
          return 0;
        }
        return prev + 100 / (4000 / 100);
      });
    }, 100);
  }, [api, currentIndex, snapPoints.length]);

  // Start timer on mount
  useEffect(() => {
    if (snapPoints.length === 0) return;
    startProgress();
    return () => clearInterval(progressInterval.current!);
  }, [startProgress, snapPoints.length]);

  // Click Handler
  const jumpTo = useCallback(
    (index: number) => {
      if (!api) return;
      clearInterval(progressInterval.current!);
      api.scrollTo(index);
      setProgress(0);
      startProgress();
    },
    [api, startProgress]
  );

  return (
    <div className="w-full mx-auto flex flex-col space-y-5 max-w-md">
      <h1 className="text-center text-2xl font-bold">How To Play</h1>
      <Carousel
        setApi={setApi}
        opts={{ loop: true, align: "center" }}
        className="relative"
      >
        <CarouselContent>
          {Array.from({ length: 5 }).map((_, index) => (
            <CarouselItem key={index}>
              <div className="h-64 grid place-items-center text-4xl font-bold bg-pink-500">
                {index + 1}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Dot navigation with circular progress border */}
      <div className="flex items-center justify-center gap-4">
        {snapPoints.map((_, i) => {
          const radius = 12; // Slightly larger radius for outer border
          const circumference = 2 * Math.PI * radius;
          const offset =
            currentIndex === i
              ? circumference * (1 - progress / 100)
              : circumference;

          return (
            <div
              key={i}
              onClick={() => jumpTo(i)}
              className="relative w-6 h-6 flex items-center justify-center cursor-pointer"
            >
              {/* Outer progress border */}
              {currentIndex === i && (
                <svg
                  className="absolute w-8 h-8"
                  width="32"
                  height="32"
                  style={{ transform: "rotate(-90deg)" }}
                >
                  <circle
                    cx="16"
                    cy="16"
                    r={radius}
                    stroke="transparent"
                    strokeWidth="3"
                    fill="none"
                  />
                  <motion.circle
                    cx="16"
                    cy="16"
                    r={radius}
                    stroke="white"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    initial={false}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 0.1, ease: "linear" }}
                  />
                </svg>
              )}

              {/* The white dot */}
              <span className="w-3.5 h-3.5 rounded-full bg-white"></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
