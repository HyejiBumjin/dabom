import "server-only";
import { firebaseStore, type FirebaseStore, type Order, type ReportWithAccess } from "@/lib/firebase/store";
import { RequestSecurityError } from "@/lib/security/request";
import { canReadSajuReport } from "@/lib/saju/account";
import { allowsDevelopmentReports } from "./payment-mode";
import { getPortOnePayment, PortOnePaymentLookupError, PortOnePaymentNetworkError } from "./server";
import { hasPaymentReadGrace, type PaymentCheckOutcome } from "./verification-policy";

const unavailable = () => new RequestSecurityError(503, "결제 상태를 확인하는 중이야. 잠시 뒤 다시 열어줘. 다시 결제할 필요는 없어.", 30, "PAYMENT_VERIFICATION_REQUIRED");
const denied = () => new RequestSecurityError(404, "이 리포트의 구매 권한을 확인할 수 없어. 내 운세함에서 확인해줘.");
function isTransient(error: unknown) {
  return error instanceof PortOnePaymentNetworkError || error instanceof PortOnePaymentLookupError && (error.status === 429 || error.status >= 500);
}

/** Reconcile existing PAID orders. New purchases still require fulfillOrder's
 * server price, product and owner checks. No browser value can grant access. */
export async function requireVerifiedPayment(userId: string, orderId: string, options: { force?: boolean; completedRead?: boolean } = {}, db: FirebaseStore = firebaseStore, lookup = getPortOnePayment): Promise<Order> {
  const claim = await db.beginPaymentCheck(userId, orderId, Boolean(options.force)).catch(() => { throw unavailable(); });
  if (claim.kind === "denied") throw denied();
  if (claim.kind === "cached") return claim.order;
  if (claim.kind === "busy" || claim.kind === "cooldown") {
    if (!options.force && options.completedRead && hasPaymentReadGrace(claim.order)) return claim.order;
    throw unavailable();
  }
  let outcome: PaymentCheckOutcome;
  try {
    const payment = await lookup(claim.order.merchantUid);
    // The adapter checks provider store/channel. Keep ID, amount and currency
    // checks here too, so a mismatched result cannot grant or revoke this order.
    if (payment.id !== claim.order.merchantUid || payment.amount !== claim.order.amount || payment.currency !== "KRW" || !Number.isSafeInteger(payment.amount) || payment.amount <= 0) outcome = "rejected";
    else if (["CANCELLED", "PARTIAL_CANCELLED"].includes(payment.status)) outcome = "cancelled";
    else outcome = payment.status === "PAID" ? "verified" : "rejected";
  } catch (error) {
    // Missing credentials, 401/403/404, malformed payloads and integrity failures
    // fail closed. Only provider/network outages get bounded completed-read grace.
    outcome = isTransient(error) ? "unavailable" : "rejected";
  }
  const result = await db.finishPaymentCheck(userId, orderId, claim.checkId, outcome).catch(() => { throw unavailable(); });
  if (result.order.status !== "PAID") throw denied();
  if (!result.applied) throw unavailable();
  if (outcome === "verified") return result.order;
  console.error("[payment-reconciliation] verification unavailable", { kind: outcome });
  if (!options.force && options.completedRead && hasPaymentReadGrace(result.order)) return result.order;
  throw unavailable();
}

/** Content delivery and model execution must both pass this boundary. */
export async function requireReportEntitlement(report: ReportWithAccess, userId: string, mode: "read" | "generate") {
  if (!canReadSajuReport(report, { id: userId })) throw denied();
  if (report.order) {
    if (report.order.userId !== userId) throw denied();
    await requireVerifiedPayment(userId, report.order.id, { force: mode === "generate", completedRead: mode === "read" && report.status === "COMPLETED" && Boolean(report.content) });
  } else if (mode === "generate" && !allowsDevelopmentReports()) throw denied();
}
