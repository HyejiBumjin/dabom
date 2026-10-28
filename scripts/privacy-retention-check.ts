import { accountScope } from "../src/lib/account-scope";
import { restoreProfileDraft } from "../src/lib/profile-draft";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "../src/lib/firebase/admin";
import { FirebaseStore } from "../src/lib/firebase/store";
import { eraseAccount, accountDeletionPlan, legalOrderRecord } from "../src/lib/privacy/account-deletion";
import { saveSajuProfile } from "../src/lib/saju/library-service";
import { createServiceRequest, serviceRequestSchema } from "../src/lib/privacy/service-request";
import { POLICY_VERSION } from "../src/lib/commerce/policy";
import { readFileSync } from "node:fs";

loadEnvConfig(process.cwd(), true);
const db = getFirebaseAdminFirestore();
const root = db.collection(`test_privacy_${randomUUID().replaceAll("-", "")}`).doc("sandbox");
class IsolatedStore extends FirebaseStore {
  constructor(private namespace: string) { super(() => db); }
  collection(name: string) { return root.collection(this.namespace + name); }
}
const stores = [new IsolatedStore(""), new IsolatedStore("payment_test_")];
const uid = "kakao_98765001", other = "kakao_98765002", caseKey = randomUUID();
let passed = 0;
function check(name: string, ok: unknown) { assert.ok(ok, name); passed++; console.log(`PASS ${name}`); }
const input = { name: "삭제 합성 사용자", relationship: "SELF" as const, gender: "female" as const, birthDate: "1995-05-20", birthTime: "20:20", calendar: "solar" as const, isLeapMonth: false };
const meta = { productCode: "yearly_2026", model: "fixture", promptVersion: "fixture" };
const authCalls: string[] = [];
let failAuthDeletion = true;
const auth = {
  updateUser: async () => { authCalls.push("disable"); return {} as never; },
  revokeRefreshTokens: async () => { authCalls.push("revoke"); },
  deleteUser: async () => { authCalls.push("delete"); if (failAuthDeletion) throw new Error("Synthetic interruption"); },
};
async function main() {
  const now = new Date("2026-10-28T12:00:00Z");
  const paid = legalOrderRecord("order", { userId: uid, name: "SECRET_NAME", birthDate: "SECRET_BIRTH", status: "PAID", amount: 3900, paidAt: Timestamp.fromDate(new Date("2026-10-01")), createdAt: Timestamp.fromDate(new Date("2026-09-30")) }, [{ acceptedAt: "2026-09-30", profileId: "SECRET_PROFILE", version: "old" }], [{ firstDeliveredAt: Timestamp.fromDate(new Date("2026-10-02")), contentJson: "SECRET_BODY", myeongsikJson: "SECRET_CHART" }], now);
  check("legal archive excludes name/birth/profile/chart/body", !JSON.stringify(paid).includes("SECRET"));
  check("5 years starts at latest supply event, not deletion date", paid.purgeAt?.toISOString() === "2031-10-02T00:00:00.000Z");
  const held = legalOrderRecord("order", { userId: uid, createdAt: new Date("2026-10-01"), legalHold: true }, [], [], now);
  check("legal hold disables TTL", held.purgeAt === null && held.legalHold);
  const unpaid = legalOrderRecord("order", { userId: uid, status: "READY", createdAt: new Date("2026-10-01") }, [], [], now);
  check("abandoned checkout does not acquire five-year retention", unpaid.retentionClass === "abandoned-checkout" && unpaid.purgeAt?.toISOString() === "2026-10-31T00:00:00.000Z");
  assert.throws(() => legalOrderRecord("bad", { userId: uid }, [], [], now)); check("unknown retention dates fail closed", true);
  const config = JSON.parse(readFileSync("firestore.indexes.json", "utf8"));
  check("TTL restricted to ephemeral/segregated archive collections", config.fieldOverrides.length === 12 && config.fieldOverrides.every((f: { collectionGroup: string; ttl: boolean }) => f.ttl && /^(payment_test_)?(oauthAttempts|sessions|rateLimits|legalRecords|privacyJobs|serviceRequests)$/.test(f.collectionGroup)));
  for (const store of stores) {
    await store.saveAccount(uid, "98765001", "합성");
    await store.saveAccount(other, "98765002", "다른 사람");
    await store.collection("sessions").doc("synthetic_session").set({ uid, expiresAt: Timestamp.fromMillis(Date.now() + 10000) });
    await saveSajuProfile(other, input, store);
  }
  const store = stores[0];
  check("forged account and missing deletion consent rejected", !serviceRequestSchema.safeParse({kind:"ACCOUNT_DELETE",requestKey:caseKey,deletionAcknowledged:true,userId:other}).success && !serviceRequestSchema.safeParse({kind:"ACCOUNT_DELETE",requestKey:caseKey}).success);
  const caseId = await createServiceRequest(store, uid, {kind:"ACCOUNT_DELETE",requestKey:caseKey,deletionAcknowledged:true});
  check("network retry reuses one verified support request", caseId === await createServiceRequest(store, uid, {kind:"ACCOUNT_DELETE",requestKey:caseKey,deletionAcknowledged:true}) && (await store.collection("serviceRequests").get()).size === 1);
  await assert.rejects(() => createServiceRequest(store, other, {kind:"REFUND", requestKey:randomUUID(),orderId:"saju_foreign"})); check("foreign refund order is rejected", true);
  await assert.rejects(() => eraseAccount(stores, auth, uid, `unverified_${randomUUID()}`)); check("operator cannot erase without authenticated deletion request", true);
  await store.collection("products").doc(meta.productCode).create({ id: meta.productCode, code: meta.productCode, name: "합성 상품", price: 3900, active: true });
  const profile = await saveSajuProfile(uid, input, store);
  const oldAccount = (await store.getAccount(uid))!;
  const originalProfile = (await store.getProfile(profile.profileId))!;
  const order = await store.prepareOrder(uid, profile.profileId, meta, { version: POLICY_VERSION, terms: true, digitalContent: true });
  assert.ok(!order.existing);
  const report = await store.fulfillOrder(uid, order.orderId, { id: order.orderId, amount: 3900, status: "PAID", currency: "KRW" }, meta);
  const lease = await store.claimReport(report.id, {}, uid, false);
  assert.ok(lease);
  const before = await accountDeletionPlan(stores, uid);
  check("dry-run counts only the requested account and changes nothing", before[0].counts.profiles === 1 && before[0].counts.orders === 1 && authCalls.length === 0);
  await assert.rejects(() => eraseAccount(stores, auth, "../users", caseId)); check("unsafe identity cannot enter deletion", true);
  await assert.rejects(() => eraseAccount(stores, auth, uid, caseId));
  check("auth failure leaves both namespaces locked", (await store.getAccount(uid)) === null && (await stores[1].getAccount(uid)) === null);
  await assert.rejects(() => store.saveAccount(uid, "98765001", "new")); check("login cannot overwrite deletion lock", true);
  await assert.rejects(() => store.saveProfile(originalProfile, oldAccount.dataEpoch!)); check("in-flight profile save cannot recreate removed data", true);
  await assert.rejects(() => store.updateReport(report.id, lease, { status: "COMPLETED", content: "late content" })); check("late generator cannot restore deleted report", true);
  await assert.rejects(() => store.fulfillOrder(uid, order.orderId, { id: order.orderId, amount: 3900, status: "PAID", currency: "KRW" }, meta)); check("late payment cannot recreate content", true);
  await assert.rejects(() => eraseAccount(stores, auth, uid, `other_${randomUUID()}`)); check("another deletion case cannot take over a pending operation", true);
  check("financial archive survives interruption", (await store.collection("legalRecords").doc(order.orderId).get()).exists);
  check("auth disabled and refresh tokens revoked before deletion", authCalls.slice(0,3).join(",") === "disable,revoke,delete");
  failAuthDeletion = false;
  await eraseAccount(stores, auth, uid, caseId);
  const after = await accountDeletionPlan(stores, uid);
  check("retry completes deletion in live and payment-test namespaces", after.every(p => !p.accountPresent && p.sessions === 0 && Object.values(p.counts).every(c => c === 0)));
  check("other user's data remains", (await store.getAccount(other)) !== null && (await accountDeletionPlan(stores, other)).every(p => p.counts.profiles === 1));
  check("closed case has 3-year expiry and no content", (await store.collection("privacyJobs").doc(caseId).get()).get("purgeAt") instanceof Timestamp);
  const archive = (await store.collection("legalRecords").doc(order.orderId).get()).data()!;
  check("consent version and amount preserved", archive.consents[0].version === POLICY_VERSION && archive.amount === 3900);
  const rejoined = await store.saveAccount(uid, "98765001", "새 가입");
  const freshProfile = await saveSajuProfile(uid, input, store);
  check("rejoin invalidates old browser identity and birth draft", accountScope(oldAccount) !== accountScope(rejoined) && restoreProfileDraft(JSON.stringify({accountId:accountScope(oldAccount),input}),accountScope(rejoined)) === null);
  check("rejoin has fresh profile and provider payment IDs", rejoined.dataEpoch !== oldAccount.dataEpoch && freshProfile.profileId !== profile.profileId && store.orderId(uid, freshProfile.profileId, meta.productCode) !== order.orderId);
  await assert.rejects(() => store.saveProfile(originalProfile, oldAccount.dataEpoch!)); check("old account epoch cannot write after rejoin", true);
  check("completed case replay never deletes rejoined account", (await eraseAccount(stores, auth, uid, caseId)).alreadyCompleted && (await store.getAccount(uid)) !== null);
  await assert.rejects(() => eraseAccount(stores, auth, other, caseId)); check("case replay cannot target a different user", true);
  const legacyId = "kakao_98765003";
  await store.collection("users").doc(legacyId).create({ id: legacyId, kakaoId: "98765003", nickname: "legacy", createdAt: new Date() });
  const legacyBefore = await store.profileId(legacyId, "birth");
  await store.saveAccount(legacyId, "98765003", "legacy2");
  check("existing accounts keep legacy deterministic IDs", legacyBefore === await store.profileId(legacyId, "birth") && !(await store.getAccount(legacyId))!.dataEpoch);
  console.log(`Privacy regression: ${passed} passed (synthetic data only; Auth mocked, no payment or LLM).`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Privacy check failed"); process.exitCode = 1; }).finally(async () => {
  for (const collection of await root.listCollections()) {
    for (;;) { const page = await collection.limit(200).get(); if (page.empty) break; const batch = db.batch(); page.docs.forEach(d => batch.delete(d.ref)); await batch.commit(); }
  }
  await root.delete(); await db.terminate();
});
