import { createBrowserClient } from "@supabase/ssr";
import { env } from "../env";

export function createClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return null;
  }
  return createBrowserClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}
