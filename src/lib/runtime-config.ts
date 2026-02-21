import { hasSupabase, hasToss } from "./env";

/**
 * Runtime feature flags for preview mode
 */
export const runtimeConfig = {
  supabaseReady: hasSupabase(),
  tossReady: hasToss(),
  previewMode: !hasSupabase() || !hasToss(),
} as const;
