import { Suspense } from "react";
import GameJoinOnlyPage from "./GameJoinOnlyPage";

export default function JoinPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GameJoinOnlyPage />
    </Suspense>
  );
}
