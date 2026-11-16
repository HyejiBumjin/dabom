import "server-only";
import { isIP } from "node:net";

function isLocalHost(hostname: string) {
  if (["localhost", "127.0.0.1", "[::1]"].includes(hostname)) return true;
  if (isIP(hostname) !== 4) return false;
  const [first, second] = hostname.split(".").map(Number);
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

/** Test payments use a dedicated local namespace, never production purchases. */
export function isPaymentTestMode() {
  const value = process.env.DABOM_PAYMENT_TEST_MODE;
  if (!value || value === "false") return false;
  if (value !== "true") throw new Error("Invalid payment test mode configuration.");
  const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  if (process.env.NODE_ENV !== "development" || process.env.DABOM_HOSTING || process.env.VERCEL || !["http:", "https:"].includes(appUrl.protocol) || !isLocalHost(appUrl.hostname)) {
    throw new Error("Payment test mode is only available on the local development server.");
  }
  return true;
}

export function paymentCollectionPrefix() { return isPaymentTestMode() ? "payment_test_" : ""; }
export function allowsDevelopmentReports() { return process.env.NODE_ENV === "development" && !isPaymentTestMode(); }
