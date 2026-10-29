import { PROFILE_NOTICE_VERSION } from "../src/lib/privacy/profile-use";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { Timestamp } from "firebase-admin/firestore";
import type { Auth, DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseAdminFirestore } from "../src/lib/firebase/admin";
import { FirebaseStore } from "../src/lib/firebase/store";
import { consumeOAuthAttempt, verifyFirebaseSession, revokeCurrentSession } from "../src/lib/firebase/auth";
import { saveSajuProfile, findExistingSajuReport, profileBirthKey } from "../src/lib/saju/library-service";
import { canReadSajuReport } from "../src/lib/saju/account";
import { POLICY_VERSION, checkoutNotices } from "../src/lib/commerce/policy";
import { READ_ACCOUNT_LIMIT, READ_WINDOW_MS } from "../src/lib/security/read-rate-limit";
import { LIBRARY_PAGE_SIZE, LIBRARY_REPORT_LIMIT } from "../src/lib/saju/library-page";

loadEnvConfig(process.cwd(), true);
const prefix = `test_${randomUUID().replaceAll("-", "")}_`;
const db = getFirebaseAdminFirestore();
// Isolated nested collections reuse the same collection-group indexes as production.
class IsolatedStore extends FirebaseStore {
  collection(name: string) { return db.collection(prefix).doc("sandbox").collection(name); }
}
const store = new IsolatedStore(() => db, prefix);
const collections = ["users", "profiles", "products", "orders", "reports", "rateLimits", "oauthAttempts", "sessions", "checkoutConsents"];
const consent = { version: POLICY_VERSION, terms: true, digitalContent: true };
const input = { name: "합성 검사", relationship: "SELF" as const, gender: "female" as const, birthDate: "1995-05-20", birthTime: "20:20", calendar: "solar" as const, isLeapMonth: false };
const metadata = { productCode: "yearly_2026", model: "test-no-model-call", promptVersion: "test" };
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
let passed = 0;
function check(name: string, condition: unknown) { assert.ok(condition, name); passed++; console.log(`PASS ${name}`); }
async function rejects(name: string, action: () => Promise<unknown>) { await assert.rejects(action); check(name, true); }
async function main() {
  await store.saveAccount("kakao_10001", "10001", "합성 사용자");
  await store.saveAccount("kakao_10002", "10002", "합성 사용자 2");
  await store.collection("products").doc(metadata.productCode).create({ ...metadata, code: metadata.productCode, name: "합성 상품", active: true, price: 3900 });
  const profiles = await Promise.all(Array.from({length: 4}, () => saveSajuProfile("kakao_10001", input, store, { version: PROFILE_NOTICE_VERSION, self: true })));
  const profileId = profiles[0].profileId;
  check("concurrent identical profile writes create one document", new Set(profiles.map(p => p.profileId)).size === 1 && profiles.filter(p => !p.existing).length === 1);
  const other = await saveSajuProfile("kakao_10002", input, store, { version: PROFILE_NOTICE_VERSION, self: true });
  check("identical birthdays are isolated by account", other.profileId !== profileId);
  const changedTime = await saveSajuProfile("kakao_10001", { ...input, birthTime: "07:00" }, store, { version: PROFILE_NOTICE_VERSION, self: true });
  check("same name and birthday cannot create a second profile by changing time", changedTime.profileId === profileId && changedTime.existing);
  for (const notice of [undefined, {}, { version: "old", self: true }, { version: PROFILE_NOTICE_VERSION, self: false }, { version: PROFILE_NOTICE_VERSION, self: true, acceptedAt: "2000-01-01" }]) {
    await rejects("missing/stale/forged subject notice rejected", () => saveSajuProfile("kakao_10001", input, store, notice));
  }
  await rejects("family input cannot be relabelled as self by the service", () => saveSajuProfile("kakao_10001", { ...input, relationship: "FAMILY" }, store, { version: PROFILE_NOTICE_VERSION, self: true }));
  await store.saveAccount("kakao_10003", "10003", "동시 중복 검사");
  const variants = await Promise.all(["07:00", "20:20", null].map(birthTime => saveSajuProfile("kakao_10003", { ...input, birthTime }, store, { version: PROFILE_NOTICE_VERSION, self: true })));
  check("concurrent different-time first submissions create one identity", new Set(variants.map(p => p.profileId)).size === 1 && variants.filter(p => !p.existing).length === 1);
  const renamed = await saveSajuProfile("kakao_10001", { ...input, name: "바뀐 표시 이름" }, store, { version: PROFILE_NOTICE_VERSION, self: true });
  check("display name edit reuses birth profile", renamed.profileId === profileId && (await store.getProfile(profileId))?.name === "바뀐 표시 이름");
  check("calendar and unknown time affect birth identity", profileBirthKey(input) !== profileBirthKey({ ...input, birthTime: null }) && profileBirthKey(input) !== profileBirthKey({ ...input, calendar: "lunar" }));
  check("unsafe document paths do not resolve", await store.getProfile("../users/owner") === null);
  const profile = await store.getProfile(profileId);
  check("server records subject notice text and date", profile?.privacyNotice?.self && profile.privacyNotice.version === PROFILE_NOTICE_VERSION && Number.isFinite(Date.parse(profile.privacyNotice.acceptedAt)));
  check("calculation JSON and date round trip", profile?.birthDate instanceof Date && typeof profile.myeongsik === "object");
  // Stored preferences from the retired topic selector must not affect new purchases.
  await store.collection("profiles").doc(profileId).update({ focusTopics: ["career"] });
  await rejects("cross-account order rejected", () => store.prepareOrder("kakao_10002", profileId, metadata));
  await rejects("production free report rejected", () => store.ensureReport("kakao_10001", profileId, metadata, undefined, false));
  for (const invalid of [undefined, {}, { ...consent, version: "old" }, { ...consent, terms: false }, { ...consent, digitalContent: false }, { ...consent, terms: "true" }, { ...consent, acceptedAt: "2000-01-01", amount: 1 }]) {
    await rejects("missing, stale or forged consent cannot prepare order", () => store.prepareOrder("kakao_10001", profileId, metadata, invalid));
  }
  check("invalid consent leaves no order or consent record", (await store.collection("orders").get()).empty && (await store.collection("checkoutConsents").get()).empty);
  const prepared = await Promise.all(Array.from({length: 4}, () => store.prepareOrder("kakao_10001", profileId, metadata, consent)));
  const orderId = store.orderId("kakao_10001", profileId, metadata.productCode);
  check("concurrent prepares reuse one unpaid order", prepared.every(o => !o.existing && o.orderId === orderId) && (await store.collection("orders").get()).size === 1);
  const firstConsent = (await store.getOrder(orderId))!.checkoutConsent!;
  check("legacy profile interests are not copied into new orders", !Object.hasOwn((await store.collection("orders").doc(orderId).get()).data()!, "focusTopics"));
  check("server snapshots exact consent, product price and timestamp", firstConsent.amount === 3900 && firstConsent.termsText === checkoutNotices.terms && firstConsent.digitalContentText === checkoutNotices.digitalContent && Number.isFinite(Date.parse(firstConsent.acceptedAt)));
  await store.prepareOrder("kakao_10001", profileId, metadata, consent);
  check("retries preserve original consent evidence", (await store.getOrder(orderId))!.checkoutConsent!.acceptedAt === firstConsent.acceptedAt && (await store.collection("checkoutConsents").get()).size === 1);
  await store.collection("orders").doc(orderId).update({ focusTopics: ["money"] });
  const payment = { id: orderId, status: "PAID", currency: "KRW", amount: 3900 };
  for (const patch of [{ id: "stolen" }, { amount: 1 }, { amount: NaN }, { status: "READY" }, { currency: "USD" }]) await rejects("forged payment cannot grant entitlement", () => store.fulfillOrder("kakao_10001", orderId, { ...payment, ...patch }, metadata));
  await rejects("other account cannot confirm payment", () => store.fulfillOrder("kakao_10002", orderId, payment, metadata));
  const paid = await Promise.all(Array.from({length: 4}, () => store.fulfillOrder("kakao_10001", orderId, payment, metadata)));
  const reportId = paid[0].id;
  check("pending report cannot be marked delivered", !await store.markReportReceipt("kakao_10001", reportId, "delivered"));
  check("concurrent confirms create exactly one report", new Set(paid.map(r => r.id)).size === 1 && (await store.collection("reports").get()).size === 1);
  check("legacy order interests do not block or personalize new reports", paid.every(report => !Object.hasOwn(report, "focusTopics")) && !Object.hasOwn((await store.collection("reports").doc(reportId).get()).data()!, "focusTopics"));
  check("paid recheckout reopens existing report", (await store.prepareOrder("kakao_10001", profileId, metadata)).existing);
  const access = (await store.getReportWithAccess(reportId))!;
  check("paid owner allowed; other user denied", canReadSajuReport(access, {id:"kakao_10001"}, false) && !canReadSajuReport(access, {id:"kakao_10002"}, false));
  check("duplicate lookup returns own paid report", (await findExistingSajuReport("kakao_10001", input, store, false))?.id === reportId && await findExistingSajuReport("kakao_10002", input, store, false) === null);
  const claims = await Promise.all(Array.from({length: 4}, () => store.claimReport(reportId, {}, "kakao_10001", false)));
  check("concurrent generation has one lease", claims.filter(Boolean).length === 1);
  const lease = claims.find(Boolean)!;
  await rejects("foreign lease cannot overwrite report", () => store.updateReport(reportId, "stolen-lease", {status:"COMPLETED"}));
  await store.collection("reports").doc(reportId).update({ generationStartedAt: Timestamp.fromMillis(Date.now()-180_000) });
  const nextLease = await store.claimReport(reportId, {}, "kakao_10001", false);
  check("interrupted generation can recover", nextLease && nextLease !== lease);
  await rejects("stale worker cannot overwrite recovery", () => store.updateReport(reportId, lease, {status:"COMPLETED"}));
  const content = { paragraphs: ["합성 내용"], nested: [[1,2],[3]] };
  await store.updateReport(reportId, nextLease!, {status:"COMPLETED", content});
  check("report nested JSON round trip", JSON.stringify((await store.getReport(reportId))?.content) === JSON.stringify(content));
  check("another account cannot record delivery", !await store.markReportReceipt("kakao_10002", reportId, "delivered"));
  check("opening cannot precede delivery", !await store.markReportReceipt("kakao_10001", reportId, "opened"));
  check("paid completed report delivery is recorded", await store.markReportReceipt("kakao_10001", reportId, "delivered"));
  check("paid owner visible-render acknowledgement is recorded", await store.markReportReceipt("kakao_10001", reportId, "opened"));
  const firstReceipt = (await store.getReport(reportId))!;
  check("receipt timestamps decode as server dates", firstReceipt.firstDeliveredAt instanceof Date && firstReceipt.firstOpenedAt instanceof Date);
  await Promise.all(Array.from({ length: 4 }, () => store.markReportReceipt("kakao_10001", reportId, "opened")));
  check("repeat opening preserves first timestamp", (await store.getReport(reportId))!.firstOpenedAt!.getTime() === firstReceipt.firstOpenedAt!.getTime());
  check("completed generation is idempotent", await store.claimReport(reportId, {}, "kakao_10001", false) === null);
  const legacyDuplicateId = "synthetic_older_duplicate";
  await store.collection("profiles").doc(legacyDuplicateId).create({
    ...(await store.collection("profiles").doc(profileId).get()).data(),
    birthTime: "07:00", birthKey: profileBirthKey({ ...input, birthTime: "07:00" }), createdAt: Timestamp.fromMillis(1_000),
  });
  check("older empty duplicate never hides a completed paid report", (await findExistingSajuReport("kakao_10001", { ...input, name: "바뀐 표시 이름", birthTime: null }, store, false))?.id === reportId);
  await rejects("crafted checkout of an old duplicate cannot charge again", () => store.prepareOrder("kakao_10001", legacyDuplicateId, metadata, consent));
  check("blocked duplicate leaves no second order", !(await store.getOrder(store.orderId("kakao_10001", legacyDuplicateId, metadata.productCode))));
  await store.collection("profiles").doc(legacyDuplicateId).delete();
  check("library exposes only own paid reports", (await store.listLibrary("kakao_10001", false))[0].reports.length === 1 && (await store.listLibrary("kakao_10002", false))[0].reports.length === 0);
  await Promise.allSettled([store.cancelOrder("kakao_10001", orderId), store.fulfillOrder("kakao_10001", orderId, payment, metadata)]);
  check("cancellation wins confirmation race", (await store.getOrder(orderId))?.status === "CANCELLED");
  check("cancelled purchase cannot record a new opening", !await store.markReportReceipt("kakao_10001", reportId, "opened"));
  await rejects("delayed confirmation cannot revive cancelled payment", () => store.fulfillOrder("kakao_10001", orderId, payment, metadata));
  await rejects("cancelled payment cannot create/rebind report", () => store.ensureReport("kakao_10001", profileId, metadata, orderId, false));
  check("cancelled access and library entitlement removed", !canReadSajuReport((await store.getReportWithAccess(reportId))!, {id:"kakao_10001"}, false) && (await store.listLibrary("kakao_10001", false))[0].reports.length === 0);
  const preview = await store.ensureReport("kakao_10002", other.profileId, metadata, undefined, true);
  await store.collection("reports").doc(preview.id).update({ status: "COMPLETED", contentJson: JSON.stringify(content) });
  check("completed development report remains private without an explicit grant", (await store.listLibrary("kakao_10002", false))[0].reports.length === 0);
  await store.collection("reports").doc(preview.id).update({ developmentPreviewAccess: { userId: "kakao_10002", grantedAt: new Date().toISOString() } });
  check("granted development preview appears only in its owner's library", (await store.listLibrary("kakao_10002", false))[0].reports[0]?.id === preview.id && (await store.listLibrary("kakao_10001", false))[0].reports.length === 0);
  check("identical birth lookup reuses granted preview", (await findExistingSajuReport("kakao_10002", input, store, false))?.id === preview.id);
  await store.collection("reports").doc(preview.id).update({ status: "FAILED" });
  await rejects("preview grant never permits unpaid regeneration", () => store.claimReport(preview.id, {}, "kakao_10002", false));
  check("incomplete preview is not offered as readable", (await store.listLibrary("kakao_10002", false))[0].reports.length === 0);
  const limits = await Promise.all(Array.from({length: 6}, () => store.consumeRateLimit("kakao_10001", "test", 3, 60_000)));
  check("concurrent rate limit allows exactly budget", limits.filter(Boolean).length === 3);
  check("other account has separate rate budget", await store.consumeRateLimit("kakao_10002", "test", 3, 60_000));
  const reservations: { credits: number; resetAt: number }[] = [];
  await Promise.all(Array.from({ length: 2 }, async () => {
    for (let i = 0; i < 12; i++) reservations.push(await store.reserveAccountReads("kakao_10001"));
  }));
  const windows = new Map<number, number>();
  for (const reservation of reservations) windows.set(reservation.resetAt, (windows.get(reservation.resetAt) ?? 0) + reservation.credits);
  check("shared read leases never overallocate under transaction races", [...windows.values()].every(credits => credits <= READ_ACCOUNT_LIMIT));
  check("shared read windows use bounded fixed expiries", reservations.every(value => value.resetAt % READ_WINDOW_MS === 0));
  check("another account receives an independent read lease", (await store.reserveAccountReads("kakao_10002")).credits === 10);
  const accountQuota = await store.collection("rateLimits").get();
  check("read quota uses one stable document per account, not per request/window", accountQuota.size === 4);

  // Same timestamps exercise the document-ID tie breaker, with many foreign rows.
  const catalogueOwner = "kakao_30001";
  for (let i = 0; i < LIBRARY_PAGE_SIZE + 2; i++) {
    await store.collection("profiles").doc(`page-${i.toString().padStart(2, "0")}`).create({ userId: catalogueOwner, name: "합성 목록", relationship: i === 0 ? "FAMILY" : "SELF", birthDate: Timestamp.fromMillis(0), birthTime: null, isLunar: false, createdAt: Timestamp.fromMillis(1_000), myeongsikJson: "THIS_MUST_NOT_BE_PARSED" });
  }
  const page1 = await store.listLibraryPage(catalogueOwner, {}, false);
  const page2 = await store.listLibraryPage(catalogueOwner, { after: page1.nextCursor! }, false);
  check("library first page is bounded with a next cursor", page1.profiles.length === LIBRARY_PAGE_SIZE && Boolean(page1.nextCursor));
  check("same-date cursor pages do not skip or duplicate profiles", page2.profiles.length === 2 && new Set([...page1.profiles, ...page2.profiles].map(item => item.id)).size === LIBRARY_PAGE_SIZE + 2 && page2.nextCursor === null);
  check("library never decodes or returns birth-chart payloads", page1.profiles.every(item => !("myeongsik" in item) && !("myeongsikJson" in item)));
  const family = await store.listLibraryPage(catalogueOwner, { relationship: "FAMILY" }, false);
  check("relationship filtering searches the full collection, not just the current page", family.profiles.length === 1 && family.profiles[0].id === "page-00");
  check("foreign cursor cannot cross ownership boundaries", (await store.listLibraryPage("kakao_10001", { after: page1.nextCursor! }, false)).profiles.every(item => item.userId === "kakao_10001"));
  check("foreign history profile cannot leak a card", (await store.listLibraryPage("kakao_10001", { profile: "page-00" }, false)).profiles.length === 0);
  check("unsafe history IDs stop before a document lookup", (await store.listLibraryPage(catalogueOwner, { profile: "../foreign" }, false)).profiles.length === 0);
  for (let i = 0; i < LIBRARY_REPORT_LIMIT + 1; i++) {
    const id = `history-${i.toString().padStart(2, "0")}`;
    await store.collection("orders").doc(id).create({ userId: catalogueOwner, sajuProfileId: "page-00", productCode: id, status: "PAID" });
    await store.collection("reports").doc(id).create({ userId: catalogueOwner, sajuProfileId: "page-00", productCode: id, orderId: id, status: "COMPLETED", createdAt: Timestamp.fromMillis(1_000), contentJson: "THIS_MUST_NOT_BE_PARSED" });
  }
  const history1 = (await store.listLibraryPage(catalogueOwner, { profile: "page-00" }, false)).profiles[0];
  const history2 = (await store.listLibraryPage(catalogueOwner, { profile: "page-00", historyAfter: history1.nextReportCursor! }, false)).profiles[0];
  check("report history is bounded and older purchases remain reachable", history1.reports.length === LIBRARY_REPORT_LIMIT && history2.reports.length === 1 && new Set([...history1.reports, ...history2.reports].map(item => item.id)).size === LIBRARY_REPORT_LIMIT + 1);
  check("paid library metadata excludes report bodies", history1.reports.every(item => !("content" in item) && !("contentJson" in item)));
  const state = randomBytes(32).toString("base64url"), binding = randomBytes(32).toString("base64url");
  const attempt = store.collection("oauthAttempts").doc(sha(state));
  await attempt.create({binding:sha(binding), next:"/saju/library", expiresAt:Timestamp.fromMillis(Date.now()+60_000)});
  check("OAuth state needs matching browser binding", await consumeOAuthAttempt(state, `${state}.${randomBytes(32).toString("base64url")}`, store) === null && await consumeOAuthAttempt(state, undefined, store) === null);
  const states = await Promise.all(Array.from({length: 3}, () => consumeOAuthAttempt(state, `${state}.${binding}`, store)));
  check("OAuth state consumed exactly once under concurrency", states.filter(Boolean).length === 1);
  check("OAuth replay denied", await consumeOAuthAttempt(state, `${state}.${binding}`, store) === null);
  await attempt.create({binding:sha(binding), next:"https://evil.test", expiresAt:Timestamp.fromMillis(Date.now()-1)});
  check("expired OAuth state denied", await consumeOAuthAttempt(state, `${state}.${binding}`, store) === null);
  const uid = "kakao_10001", cookie = "synthetic-session-no-real-token";
  await store.saveAccount(uid,"10001","합성 사용자");
  let identity = { uid, loginProvider:"kakao", firebase:{sign_in_provider:"custom"} } as unknown as DecodedIdToken;
  let revoked = false;
  const auth = {verifySessionCookie: async (_token:string, checkRevoked:boolean) => { assert.equal(checkRevoked,true); if(revoked) throw Object.assign(new Error("invalid"),{code:"auth/session-cookie-revoked"}); return identity; }} as Auth;
  check("signed cookie without active server session denied", await verifyFirebaseSession(cookie,store,auth) === null);
  await store.collection("sessions").doc(sha(cookie)).create({uid,expiresAt:Timestamp.fromMillis(Date.now()+60_000)});
  check("verified custom Kakao session resolves account", (await verifyFirebaseSession(cookie,store,auth))?.id === uid);
  identity = {...identity, loginProvider:"anonymous"};
  check("anonymous/custom non-Kakao identity denied", await verifyFirebaseSession(cookie,store,auth) === null);
  identity = {...identity, loginProvider:"kakao"}; revoked=true;
  check("Firebase revocation is enforced", await verifyFirebaseSession(cookie,store,auth) === null); revoked=false;
  await revokeCurrentSession(cookie,store);
  check("logout immediately invalidates copied session", await verifyFirebaseSession(cookie,store,auth) === null);
  const url = `https://firestore.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${prefix}/sandbox/profiles/${profileId}`;
  for (const method of ["GET","PATCH"]) {
    const response = await fetch(url, {method, ...(method === "PATCH" ? {headers:{"Content-Type":"application/json"},body:JSON.stringify({fields:{userId:{stringValue:"attacker"}}})} : {})});
    check(`deployed Firestore rules deny unauthenticated ${method}`, response.status === 403);
  }
  console.log(`\n${passed} PASS against isolated Firestore collections; no model/payment API calls.`);
}
main().catch(error => {console.error(error);process.exitCode=1;}).finally(async () => {
  for(const name of collections) {const docs=await store.collection(name).get(); await Promise.all(docs.docs.map(doc=>doc.ref.delete()));}
  console.log("Synthetic Firestore records removed.");
  await db.terminate();
});
