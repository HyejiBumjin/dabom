import { hasPortOne } from "./env";

/**
 * Runtime feature flags for preview mode
 */
export const runtimeConfig = {
  portoneReady: hasPortOne(),
  previewMode: !hasPortOne(),
} as const;
