import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { createRequire } from "node:module";
import { loadEnvConfig } from "@next/env";
import { FieldValue } from "firebase-admin/firestore";

// Actual Firestore transactions in disposable nested collections. Auth, PortOne
// and OpenAI are fixtures; no customer record, charge or live model is touched.
loadEnvConfig(process.cwd(), true);
const testEnv = process.env as Record<string, string | undefined>;
testEnv.NODE_ENV = "production";
testEnv.DABOM_PAYMENT_TEST_MODE = "false";
testEnv.NEXT_PUBLIC_APP_URL = "https://dabom.test";
testEnv.NEXT_PUBLIC_PORTONE_STORE_ID = "synthetic-store";
testEnv.NEXT_PUBLIC_PORTONE_CHANNEL_KEY = "synthetic-channel";
testEnv.PORTONE_API_SECRET = "synthetic-secret";
const signingKey = Buffer.from("synthetic-reconciliation-webhook-key");
testEnv.PORTONE_WEBHOOK_SECRET = `whsec_${signingKey.toString("base64")}`;
const require = createRequire(import.meta.url);
const { getFirebaseAdminFirestore } = require("../src/lib/firebase/admin") as typeof import("../src/lib/firebase/admin");
const { FirebaseStore, firebaseStore } = require("../src/lib/firebase/store") as typeof import("../src/lib/firebase/store");
const db = getFirebaseAdminFirestore();
const root = db.collection(`test_reconciliation_${randomUUID().replaceAll("-", "")}`).doc("sandbox");
class IsolatedStore extends FirebaseStore { collection(name: string) { return root.collection(name); } }
const store = new IsolatedStore(() => db);
firebaseStore.collection = store.collection.bind(store);
firebaseStore.transaction = store.transaction.bind(store);
const provider = require("../src/lib/portone/server") as typeof import("../src/lib/portone/server");
let providerCalls = 0, modelCalls = 0;
let providerReply: (id: string) => Promise<import("../src/lib/portone/server").PortOnePayment> = async id => ({ id, paymentId: id, status: "PAID", amount: 3900, currency: "KRW" });
require.cache[require.resolve("../src/lib/portone/server")]!.exports = { ...provider, getPortOnePayment: async (id: string) => { providerCalls++; return providerReply(id); } };
const authPath = require.resolve("../src/lib/firebase/auth"); require(authPath);
let identity: string | null = "kakao_test_owner";
require.cache[authPath]!.exports = { ...require(authPath), getFirebaseAccount: async () => identity ? { id: identity } : null };
const { Responses } = require("openai/resources/responses/responses") as typeof import("openai/resources/responses/responses");
Responses.prototype.create = (async () => { modelCalls++; throw new Error("Unexpected model execution"); }) as never;
globalThis.fetch = async () => { throw new Error("Unexpected fetch in reconciliation regression"); };
const { requireVerifiedPayment } = require("../src/lib/portone/entitlement") as typeof import("../src/lib/portone/entitlement");
const { RequestSecurityError } = require("../src/lib/security/request") as typeof import("../src/lib/security/request");
const { isPaymentReadFresh, hasPaymentReadGrace, PAYMENT_READ_FRESH_MS, PAYMENT_READ_GRACE_MS } = require("../src/lib/portone/verification-policy") as typeof import("../src/lib/portone/verification-policy");
const getReport = require("../src/app/api/saju/reports/[reportId]/route") as typeof import("../src/app/api/saju/reports/[reportId]/route");
const generate = require("../src/app/api/saju/reports/[reportId]/generate/route") as typeof import("../src/app/api/saju/reports/[reportId]/generate/route");
const confirm = require("../src/app/api/saju/payments/confirm/route") as typeof import("../src/app/api/saju/payments/confirm/route");
const webhook = require("../src/app/api/saju/payments/webhook/route") as typeof import("../src/app/api/saju/payments/webhook/route");
const { generateReport } = require("../src/lib/llm/report-generator") as typeof import("../src/lib/llm/report-generator");
const owner = "kakao_test_owner", metadata = { productCode: "yearly_2026", model: "test", promptVersion: "test" };
let passed = 0;
const check = (name: string, ok: unknown) => { assert.ok(ok, name); passed++; console.log(`PASS ${name}`); };
const payment = (id: string, status = "PAID") => ({ id, paymentId: id, status, amount: 3900, currency: "KRW" });
const post = (path: string, body?: unknown) => new Request(`https://dabom.test${path}`, { method: "POST", headers: { origin: "https://dabom.test", "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
const params = (reportId: string) => ({ params: Promise.resolve({ reportId }) });
async function read(reportId: string) { return getReport.GET(new Request("https://dabom.test/report"), params(reportId)); }
async function refresh(orderId: string, age = 0) {
  await store.collection("orders").doc(orderId).update({ paymentVerifiedAt: new Date(Date.now() - age), paymentCheckState: "VERIFIED", paymentCheckId: null, paymentCheckLeaseUntil: null, paymentCheckRetryAt: null });
}
async function seed(name: string, age = 0, completed = true) {
  const profileId = `profile_${name}`, orderId = `saju_${name}`;
  await store.collection("profiles").doc(profileId).create({ userId: owner, name: "합성", myeongsikJson: "{}", birthDate: new Date("1995-05-20"), createdAt: new Date() });
  await store.collection("orders").doc(orderId).create({ userId: owner, sajuProfileId: profileId, productCode: metadata.productCode, productId: metadata.productCode, merchantUid: orderId, status: "READY", amount: 3900, createdAt: new Date(), paidAt: null, paidAmount: null, pgTxId: null });
  const report = await store.fulfillOrder(owner, orderId, payment(orderId), metadata);
  if (completed) await store.collection("reports").doc(report.id).update({ status: "COMPLETED", contentJson: '{"paragraphs":["synthetic-private-content"]}', firstDeliveredAt: new Date() });
  await refresh(orderId, age);
  return { orderId, reportId: report.id };
}
async function rejected(action: () => Promise<unknown>, status = 503) { await assert.rejects(action, error => error instanceof RequestSecurityError && error.status === status); }
function signedWebhook(orderId: string) {
  const raw = JSON.stringify({ type: "Transaction.Paid", timestamp: new Date().toISOString(), data: { storeId: "synthetic-store", paymentId: orderId, transactionId: "synthetic-tx" } });
  const timestamp = String(Math.floor(Date.now() / 1000)), id = "synthetic-event";
  const signature = createHmac("sha256", signingKey).update(`${id}.${timestamp}.${raw}`).digest("base64");
  return new Request("https://dabom.test/webhook", { method: "POST", body: raw, headers: { "webhook-id": id, "webhook-timestamp": timestamp, "webhook-signature": `v1,${signature}` } });
}
async function main() {
  await store.collection("users").doc(owner).create({ id: owner, createdAt: new Date() });
  const fresh = await seed("fresh");
  check("fresh paid read avoids provider calls", (await read(fresh.reportId)).status === 200 && providerCalls === 0);
  identity = "kakao_other";
  check("foreign read is rejected before provider work", (await read(fresh.reportId)).status === 404 && providerCalls === 0);
  identity = null;
  check("anonymous read is rejected before provider work", (await read(fresh.reportId)).status === 401 && providerCalls === 0);
  identity = owner;
  await refresh(fresh.orderId, PAYMENT_READ_FRESH_MS + 1000);
  providerReply = async id => payment(id, "CANCELLED");
  const removed = await read(fresh.reportId);
  check("missing cancellation webhook is recovered before body delivery", removed.status === 404 && !(await removed.text()).includes("synthetic-private-content") && (await store.getOrder(fresh.orderId))?.status === "CANCELLED");
  for (const status of ["CANCELLED", "PARTIAL_CANCELLED"]) {
    const item = await seed(status.toLowerCase(), 0, false);
    providerReply = async id => payment(id, status);
    const before = providerCalls;
    const result = await generate.POST(post("/generate"), params(item.reportId));
    check(`${status} blocks actual generator even with a fresh read cache`, result.status === 404 && providerCalls === before + 1 && modelCalls === 0 && (await store.getReport(item.reportId))?.status === "PENDING");
  }
  const direct = await seed("direct_generator", 0, false);
  await rejected(() => generateReport(direct.reportId), 404);
  check("non-HTTP generator cannot bypass provider verification", modelCalls === 0 && (await store.getOrder(direct.orderId))?.status === "CANCELLED");
  const confirmation = await seed("confirm");
  const response = await confirm.POST(post("/confirm", { orderId: confirmation.orderId, paymentId: confirmation.orderId }));
  check("confirm no longer trusts a stale local PAID shortcut", response.status === 404 && (await store.getOrder(confirmation.orderId))?.status === "CANCELLED");
  const callsBeforeReplay = providerCalls;
  providerReply = async id => payment(id);
  check("late signed Paid event acknowledges terminal cancellation", (await webhook.POST(signedWebhook(confirmation.orderId))).status === 200 && providerCalls === callsBeforeReplay && (await store.getOrder(confirmation.orderId))?.status === "CANCELLED");

  const unavailable = await seed("outage", 6 * 60_000);
  providerReply = async () => { throw new provider.PortOnePaymentNetworkError(); };
  const verifiedBefore = (await store.getOrder(unavailable.orderId))!.paymentVerifiedAt!.getTime();
  check("short provider outage allows only an already completed recent report", (await read(unavailable.reportId)).status === 200);
  const beforeCooldown = providerCalls;
  await read(unavailable.reportId); await read(unavailable.reportId);
  check("outage cooldown avoids repeated provider requests", providerCalls === beforeCooldown);
  await rejected(() => requireVerifiedPayment(owner, unavailable.orderId, { force: true }, store));
  check("read grace never permits new generation or confirmation", providerCalls === beforeCooldown && (await store.getOrder(unavailable.orderId))!.paymentVerifiedAt!.getTime() === verifiedBefore);
  await store.collection("orders").doc(unavailable.orderId).update({ paymentVerifiedAt: new Date(Date.now() - PAYMENT_READ_GRACE_MS - 1000) });
  const expired = await read(unavailable.reportId);
  const expiredBody = await expired.json();
  check("grace expires without extending on failed checks", expired.status === 503 && expired.headers.get("retry-after") === "30" && expiredBody.code === "PAYMENT_VERIFICATION_REQUIRED" && !JSON.stringify(expiredBody).includes("synthetic-private-content"));
  const pending = await seed("outage_pending", 6 * 60_000, false);
  check("unfinished report receives no outage grace", (await read(pending.reportId)).status === 503);

  for (const status of [401, 403, 404]) {
    const item = await seed(`provider_${status}`, 6 * 60_000);
    providerReply = async () => { throw new provider.PortOnePaymentLookupError(status); };
    check(`provider ${status} fails closed without grace`, (await read(item.reportId)).status === 503 && (await store.getOrder(item.orderId))?.paymentCheckState === "REJECTED");
  }
  for (const status of [429, 500, 503]) {
    const item = await seed(`transient_${status}`, 6 * 60_000);
    providerReply = async () => { throw new provider.PortOnePaymentLookupError(status); };
    check(`transient provider ${status} has bounded completed-read grace`, (await read(item.reportId)).status === 200);
  }
  for (const [name, patch] of Object.entries({ amount: { amount: 1 }, currency: { currency: "USD" }, id: { id: "foreign" }, status: { status: "READY" } })) {
    const item = await seed(`invalid_${name}`, 6 * 60_000);
    providerReply = async id => ({ ...payment(id), ...patch });
    check(`invalid provider ${name} suspends access`, (await read(item.reportId)).status === 503 && (await store.getOrder(item.orderId))?.paymentCheckState === "REJECTED");
    await store.collection("orders").doc(item.orderId).update({ paymentCheckRetryAt: null });
    providerReply = async () => { throw new provider.PortOnePaymentNetworkError(); };
    check(`outage cannot restore previously rejected ${name}`, (await read(item.reportId)).status === 503);
  }
  const legacy = await seed("legacy");
  await store.collection("orders").doc(legacy.orderId).update({ paymentVerifiedAt: FieldValue.delete(), paymentCheckState: FieldValue.delete() });
  check("legacy PAID without a verification timestamp cannot use outage grace", (await read(legacy.reportId)).status === 503);
  await store.collection("orders").doc(legacy.orderId).update({ paymentCheckRetryAt: null });
  providerReply = async id => payment(id);
  check("legacy purchase recovers after valid provider verification", (await read(legacy.reportId)).status === 200 && (await store.getOrder(legacy.orderId))?.paymentCheckState === "VERIFIED");

  const duplicate = await seed("duplicate", 6 * 60_000);
  await store.collection("orders").doc(duplicate.orderId).update({ paymentCheckState: "REJECTED" });
  await store.fulfillOrder(owner, duplicate.orderId, payment(duplicate.orderId), metadata);
  check("late initial confirmation cannot erase a newer rejection", (await store.getOrder(duplicate.orderId))?.paymentCheckState === "REJECTED");
  const persistence = await seed("persistence", 6 * 60_000);
  const originalFinish = firebaseStore.finishPaymentCheck;
  firebaseStore.finishPaymentCheck = async () => { throw new Error("synthetic database outage"); };
  providerReply = async id => payment(id, "CANCELLED");
  const persistenceResponse = await read(persistence.reportId);
  check("cancellation persistence failure withholds body and cached UI permission", persistenceResponse.status === 503 && (await persistenceResponse.json()).code === "PAYMENT_VERIFICATION_REQUIRED");
  firebaseStore.finishPaymentCheck = originalFinish;
  providerReply = async id => payment(id);

  const concurrent = await seed("concurrent", 6 * 60_000);
  // Both objects use the same isolated Firestore but represent separate servers.
  const second = new IsolatedStore(() => db);
  const leases = await Promise.all(Array.from({ length: 8 }, (_, i) => (i % 2 ? store : second).beginPaymentCheck(owner, concurrent.orderId, true)));
  check("two servers and eight simultaneous checks claim one provider lease", leases.filter(lease => lease.kind === "claimed").length === 1 && leases.filter(lease => lease.kind === "busy").length === 7);
  const lease = leases.find(item => item.kind === "claimed")!;
  assert.equal(lease.kind, "claimed");
  await store.collection("orders").doc(concurrent.orderId).update({ paymentCheckLeaseUntil: new Date(Date.now() - 1000) });
  const replacement = await second.beginPaymentCheck(owner, concurrent.orderId, true);
  assert.equal(replacement.kind, "claimed");
  check("abandoned provider check can recover after lease expiry", replacement.checkId !== lease.checkId);
  check("late old worker cannot overwrite the new check", !(await store.finishPaymentCheck(owner, concurrent.orderId, lease.checkId, "verified")).applied);
  await Promise.all([store.finishPaymentCheck(owner, concurrent.orderId, replacement.checkId, "verified"), second.cancelOrder(owner, concurrent.orderId)]);
  check("cancellation wins racing PAID verification", (await store.getOrder(concurrent.orderId))?.status === "CANCELLED");
  const repaid = await store.finishPaymentCheck(owner, concurrent.orderId, replacement.checkId, "verified");
  check("delayed PAID result cannot restore terminal cancellation", !repaid.applied && repaid.order.status === "CANCELLED");
  await assert.rejects(() => store.beginPaymentCheck("kakao_other", legacy.orderId, true));
  await assert.rejects(() => store.finishPaymentCheck("kakao_other", legacy.orderId, "forged", "cancelled"));
  check("lease methods independently enforce order ownership", true);

  const inflight = await seed("inflight", 6 * 60_000, false);
  await assert.rejects(() => store.claimReport(inflight.reportId, {}, owner, false));
  check("direct generation claim requires recent verified payment", true);
  await requireVerifiedPayment(owner, inflight.orderId, { force: true }, store);
  const generationId = await store.claimReport(inflight.reportId, {}, owner, false);
  check("fresh provider verification permits exactly the normal generation claim", Boolean(generationId));
  await store.cancelOrder(owner, inflight.orderId);
  await assert.rejects(() => store.updateReport(inflight.reportId, generationId!, { status: "COMPLETED", content: { paragraphs: ["must-not-publish"] } }));
  check("cancellation during model execution prevents publication", (await store.getReport(inflight.reportId))?.content === null);
  const now = Date.now();
  check("future, invalid and missing timestamps cannot mint read grace", [undefined, new Date(NaN), new Date(now + 1000)].every(paymentVerifiedAt => !isPaymentReadFresh({ status: "PAID", paymentCheckState: "VERIFIED", paymentVerifiedAt }, now) && !hasPaymentReadGrace({ status: "PAID", paymentCheckState: "UNAVAILABLE", paymentVerifiedAt }, now)));
  check("no live model was called", modelCalls === 0);
  console.log(`\n${passed} PASS; actual isolated Firestore; mocked Auth/PortOne/OpenAI.`);
}
main().catch(error => { console.error(error instanceof assert.AssertionError ? error : "Payment reconciliation check failed"); process.exitCode = 1; }).finally(async () => {
  for (const name of ["profiles", "orders", "reports", "rateLimits"]) {
    const snapshots = await store.collection(name).get();
    await Promise.all(snapshots.docs.map(doc => doc.ref.delete()));
    assert.equal((await store.collection(name).get()).size, 0);
  }
  console.log("Synthetic records removed and empty collections verified.");
  await db.terminate();
});
