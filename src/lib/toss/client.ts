/**
 * Client-side Toss Payments Widget utilities
 * Widget is loaded via script tag; this provides helpers
 */
import { env } from "../env";

export function getTossClientKey(): string {
  return env.TOSS_CLIENT_KEY || "";
}

export function getTossCardVariantKey(): string {
  return env.TOSS_CARD_VARIANT_KEY || "";
}
