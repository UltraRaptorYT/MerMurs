"use client";

import { Suspense } from "react";
import GameJoinPage from "./GameJoinPage";

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GameJoinPage />
    </Suspense>
  );
}
