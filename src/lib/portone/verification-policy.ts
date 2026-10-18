/** Server-owned timestamps only. Read grace never extends after a failed check. */
export const PAYMENT_READ_FRESH_MS = 5 * 60_000;
export const PAYMENT_READ_GRACE_MS = 15 * 60_000;
export const PAYMENT_GENERATION_FRESH_MS = 30_000;
export const PAYMENT_CHECK_LEASE_MS = 20_000;
export const PAYMENT_CHECK_RETRY_MS = 30_000;
export type PaymentVerification = {
  paymentVerifiedAt?: Date;
  paymentCheckState?: "VERIFIED" | "UNAVAILABLE" | "REJECTED";
  paymentCheckId?: string | null;
  paymentCheckStartedAt?: Date;
  paymentCheckLeaseUntil?: Date | null;
  paymentCheckRetryAt?: Date | null;
};
export type PaymentCheckOutcome = "verified" | "cancelled" | "rejected" | "unavailable";
function verifiedWithin(order: PaymentVerification & { status: string }, duration: number, now: number) {
  const time = order.paymentVerifiedAt?.getTime();
  return order.status === "PAID" && typeof time === "number" && Number.isFinite(time) && time <= now && now - time < duration;
}
export function isPaymentReadFresh(order: PaymentVerification & { status: string }, now = Date.now()) {
  return order.paymentCheckState === "VERIFIED" && verifiedWithin(order, PAYMENT_READ_FRESH_MS, now);
}
export function hasPaymentReadGrace(order: PaymentVerification & { status: string }, now = Date.now()) {
  return order.paymentCheckState === "UNAVAILABLE" && verifiedWithin(order, PAYMENT_READ_GRACE_MS, now);
}
export function isPaymentGenerationFresh(order: PaymentVerification & { status: string }, now = Date.now()) {
  return order.paymentCheckState === "VERIFIED" && verifiedWithin(order, PAYMENT_GENERATION_FRESH_MS, now);
}
