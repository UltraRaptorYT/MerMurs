"use client";

import { useState, useEffect, useRef } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";

type Member = { id: string; name: string };

export default function PresenceClient() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [joined, setJoined] = useState(false);
  const channelRef = useRef<any>(null);

  const supabase = createSupabaseClient();

  const handleJoin = async () => {
    if (!name.trim() || !roomCode.trim()) return;

    const channel = supabase.channel(`presence-room:${roomCode}`, {
      config: { presence: { key: name } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setMembers(
          Object.entries(state).map(([key]) => ({ id: key, name: key }))
        );
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") {
          return;
        }
        await channel.track({
          name: name,
        });
      });

    channelRef.current = channel;
    setJoined(true);
  };

  useEffect(() => {
    const cleanup = async () => {
      if (channelRef.current) {
        const chan = channelRef.current;
        // Gracefully leave presence channel
        chan.unsubscribe();
        await supabase.removeChannel(chan);
      }
    };

    window.addEventListener("beforeunload", cleanup);
    return () => {
      cleanup();
      window.removeEventListener("beforeunload", cleanup);
    };
  }, []);

  return (
    <div className="p-4">
      {!joined ? (
        <div>
          <input
            className="border p-2 mr-2"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="border p-2 mr-2"
            placeholder="Room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
          />
          <button className="bg-blue-500 text-white p-2" onClick={handleJoin}>
            Join Room
          </button>
        </div>
      ) : (
        <div>
          <h2 className="mt-4 text-xl">🟢 Room: {roomCode}</h2>
          <h3 className="mt-2">Online Users:</h3>
          <ul>
            {members.map((user) => (
              <li key={user.id}>{user.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
