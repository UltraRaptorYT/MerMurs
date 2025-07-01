import PresenceClient from "@/components/PresenceClient";

export default function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl mb-4">👋 Supabase Realtime Presence Room</h1>
      <PresenceClient />
    </main>
  );
}
