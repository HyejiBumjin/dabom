import { createHash } from "node:crypto";
import { firebaseStore, type FirebaseStore } from "@/lib/firebase/store";
import { KoreanPolicyAdapter } from "@/lib/saju/korean-policy-adapter";
import { getReportPrompt } from "@/lib/prompts/v6";
import { getConfiguredReportModel } from "@/lib/llm/report-config";
import { SAJU_PRODUCT_CODE, type ProfileInput } from "@/lib/saju/profile-input";
import { canReadSajuReport } from "@/lib/saju/account";
import { allowsDevelopmentReports } from "@/lib/portone/payment-mode";
import { requireVerifiedPayment } from "@/lib/portone/entitlement";
import { assertProfileAge } from "./profile-age";

const reportMetadata = () => ({ productCode: SAJU_PRODUCT_CODE, promptVersion: getReportPrompt().version, model: getConfiguredReportModel() });
export function profileBirthKey(input: ProfileInput) {
  return createHash("sha256").update(JSON.stringify([input.gender, input.birthDate, input.birthTime, input.calendar, input.calendar === "lunar" && input.isLeapMonth])).digest("hex");
}
export async function findExistingSajuReport(userId: string, input: ProfileInput, db: FirebaseStore = firebaseStore, development = allowsDevelopmentReports()) {
  const profileId = await db.profileId(userId, profileBirthKey(input));
  const report = await db.getReportWithAccess(db.reportId(profileId, SAJU_PRODUCT_CODE));
  return report && canReadSajuReport(report, { id: userId }, development) ? { id: report.id, sajuProfileId: profileId } : null;
}
export async function saveSajuProfile(userId: string, input: ProfileInput, db: FirebaseStore = firebaseStore) {
  if (!userId) throw new Error("LOGIN_REQUIRED");
  assertProfileAge({ birthDate: new Date(`${input.birthDate}T00:00:00.000Z`), isLunar: input.calendar === "lunar", isLeapMonth: input.isLeapMonth });
  const account = await db.getAccount(userId);
  if (!account) throw new Error("ACCOUNT_UNAVAILABLE");
  const birthKey = profileBirthKey(input);
  const existing = await db.getProfile(await db.profileId(userId, birthKey));
  const myeongsik = existing?.myeongsik ?? new KoreanPolicyAdapter().calculate({ ...input, birthTime: input.birthTime ?? "12:00", birthTimeKnown: Boolean(input.birthTime) });
  return db.saveProfile({ userId, birthKey, name: input.name, relationship: input.relationship, gender: input.gender === "male" ? "MALE" : "FEMALE", birthDate: new Date(`${input.birthDate}T00:00:00.000Z`), birthTime: input.birthTime, isLunar: input.calendar === "lunar", isLeapMonth: input.isLeapMonth, myeongsik }, account.dataEpoch ?? "legacy");
}
export function ensureSajuReport(userId: string, profileId: string, orderId?: string, db: FirebaseStore = firebaseStore) {
  return db.ensureReport(userId, profileId, reportMetadata(), orderId);
}
export async function prepareSajuOrder(userId: string, profileId: string, db: FirebaseStore = firebaseStore, consent?: unknown) {
  const existing = await db.getReportWithAccess(db.reportId(profileId, SAJU_PRODUCT_CODE));
  if (existing && canReadSajuReport(existing, { id: userId }, false)) {
    if (existing.order) await requireVerifiedPayment(userId, existing.order.id, { completedRead: existing.status === "COMPLETED" }, db);
    return { existing: true as const, reportId: existing.id };
  }
  const result = await db.prepareOrder(userId, profileId, reportMetadata(), consent);
  if (result.existing) await requireVerifiedPayment(userId, db.orderId(userId, profileId, SAJU_PRODUCT_CODE), {}, db);
  return result;
}
export function verifySajuPayment(order: { merchantUid: string; amount: number | null; product: { price: number } }, payment: { id: string; amount: number; status: string; currency: string }) {
  if (!Number.isSafeInteger(payment.amount) || payment.amount <= 0) throw new Error("PAYMENT_AMOUNT_MISMATCH");
  if (payment.id !== order.merchantUid) throw new Error("PAYMENT_ID_MISMATCH");
  if (payment.amount !== (order.amount ?? order.product.price)) throw new Error("PAYMENT_AMOUNT_MISMATCH");
  if (payment.currency !== "KRW") throw new Error("PAYMENT_CURRENCY_MISMATCH");
  if (payment.status !== "PAID") throw new Error("PAYMENT_NOT_PAID");
}
export function fulfillSajuOrder(userId: string, merchantUid: string, payment: { id: string; amount: number; status: string; currency: string }, db: FirebaseStore = firebaseStore) {
  return db.fulfillOrder(userId, merchantUid, payment, reportMetadata());
}
