import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL as string) || "";
const supabaseAnonKey =
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) || "";

export function createSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
