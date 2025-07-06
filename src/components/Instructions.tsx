"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { motion } from "framer-motion";
import Image from "next/image";

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

  const instructions = [
    {
      img: "/MERMURS.png",
      main: "Join the Game",
      sub: "🖱️ Enter your name and room code to join the game lobby.",
    },
    {
      img: "/MERMURS.png",
      main: "Start with a Phrase",
      sub: "🎧 Listen to the AI-generated audio carefully! It might be in a random language.",
    },
    {
      img: "/MERMURS.png",
      main: "Record What You Heard",
      sub: "🎙️ Repeat what you heard by recording your version of the phrase.",
    },
    {
      img: "/MERMURS.png",
      main: "Pass It Along",
      sub: "🔁 The AI will transcribe and translate your recording for the next player.",
    },
    {
      img: "/MERMURS.png",
      main: "See What Happened",
      sub: "😂 Watch and listen to the hilarious results at the end of the game!",
    },
  ];

  return (
    <div className="w-full mx-auto flex flex-col space-y-5 max-w-md">
      <h1 className="text-center text-2xl font-bold">How To Play</h1>
      <Carousel
        setApi={setApi}
        opts={{ loop: true, align: "center" }}
        className="relative"
      >
        <CarouselContent>
          {instructions.map((val, index) => (
            <CarouselItem
              key={index}
              className="flex flex-col justify-center items-center space-y-2"
            >
              <Image
                src={val["img"]}
                alt={val["main"]}
                width={100}
                height={100}
                className="w-48"
              />
              <div className="flex gap-1 text-xl font-semibold text-center mt-6">
                <span>{index + 1}.</span>
                <span>{val["main"]}</span>
              </div>
              <span className="text-center px-6">{val["sub"]}</span>
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
