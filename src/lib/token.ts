import { randomBytes } from "crypto";

/**
 * Generate a URL-safe random token for gift links
 */
export function generateGiftToken(): string {
  return randomBytes(24).toString("base64url");
}
