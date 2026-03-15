import { hasPortOne, hasSupabase } from "./env";

/**
 * Runtime feature flags for preview mode
 */
export const runtimeConfig = {
  supabaseReady: hasSupabase(),
  portoneReady: hasPortOne(),
  previewMode: !hasSupabase() || !hasPortOne(),
} as const;
