"use client";

import { useEffect, useRef, useState } from "react";

interface CountdownTimerProps {
  duration: number; // in seconds
  size?: number;
  paused?: boolean;
  reset?: boolean;
  startTime?: number; // new: timestamp in ms
  onStart?: () => void;
  onComplete?: () => void;
}

export default function CountdownTimer({
  duration,
  size = 48,
  paused = false,
  reset = false,
  startTime,
  onStart,
  onComplete,
}: CountdownTimerProps) {
  const [progress, setProgress] = useState(1);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (reset) {
      cancelAnimationFrame(frameRef.current!);
      setProgress(1);
      return;
    }

    const effectiveStart = startTime ?? Date.now();
    if (onStart) onStart();

    const tick = () => {
      const elapsed = (Date.now() - effectiveStart) / 1000;
      const ratio = Math.max(1 - elapsed / duration, 0);
      setProgress(ratio);
      if (ratio > 0 && !paused) {
        frameRef.current = requestAnimationFrame(tick);
      } else if (ratio <= 0) {
        onComplete?.();
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current!);
  }, [startTime, paused, reset, duration, onComplete, onStart]);

  const radius = size / 2;
  const angle = progress * 2 * Math.PI;
  const x = radius + radius * Math.sin(angle);
  const y = radius - radius * Math.cos(angle);
  const largeArcFlag = progress > 0.5 ? 1 : 0;

  const pathData =
    progress === 1
      ? ""
      : `M ${radius},${radius} L ${radius},0 A ${radius},${radius} 0 ${largeArcFlag} 1 ${x},${y} Z`;

  return (
    <svg width={size} height={size} className="scale-x-[-1]">
      <path d={pathData} fill="white" />
    </svg>
  );
}
