"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Error() {
  const [countdown, setCountdown] = useState(3);
  const router = useRouter();

  useEffect(() => {
    if (countdown === 0) {
      router.push("/");
      return;
    }

    const intervalId = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [countdown, router]);

  return (
    <div className="justify-center items-center flex flex-col h-[100svh] gap-2">
      <h1 className="text-4xl font-bold">404 Not Found</h1>
      <p>
        Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}...
      </p>
    </div>
  );
}
