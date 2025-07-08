"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const countdownNumbers = ["3", "2", "1"];

export default function Countdown({ onComplete }: { onComplete?: () => void }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < countdownNumbers.length - 1) {
      const timer = setTimeout(() => setIndex((prev) => prev + 1), 1000);
      return () => clearTimeout(timer);
    } else if (index === countdownNumbers.length - 1) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [index, onComplete]);

  return (
    <div className="fixed inset-0 flex justify-center items-center m-0 bg-black/50 z-10">
      <AnimatePresence mode="wait">
        <motion.div
          key={countdownNumbers[index]}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 1 }}
          exit={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="text-9xl font-extrabold text-white"
        >
          {countdownNumbers[index]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
