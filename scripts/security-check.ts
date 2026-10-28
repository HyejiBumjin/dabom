import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createRequire } from "node:module";

// This process uses only synthetic identities, an in-memory DB, and provider fixtures.
// Unexpected network calls fail. No real login, charge, report, or customer row is used.
const require = createRequire(import.meta.url);
const testEnv = process.env as Record<string, string | undefined>;
testEnv.NODE_ENV = "production";
testEnv.DATABASE_URL = "postgresql://USER:PASSWORD@127.0.0.1:1/synthetic";
testEnv.NEXT_PUBLIC_APP_URL = "https://dabom.test";
testEnv.NEXT_PUBLIC_PORTONE_STORE_ID = "store-test";
testEnv.NEXT_PUBLIC_PORTONE_CHANNEL_KEY = "channel-test";
testEnv.PORTONE_API_SECRET = "synthetic-provider-secret";
const signingKey = Buffer.from("synthetic-webhook-key-for-security-tests-only");
testEnv.PORTONE_WEBHOOK_SECRET = `whsec_${signingKey.toString("base64")}`;
globalThis.fetch = async () => { throw new Error("Unexpected network call in security regression"); };

let passed = 0;
function check(name: string, ok: unknown) { assert.ok(ok, name); passed++; console.log(`PASS ${name}`); }
const { firebaseStore: store } = require("../src/lib/firebase/store") as typeof import("../src/lib/firebase/store");
let identity: string | null = "A";
let authError = false;
let temporaryAuthError = false;
let anonymousSession = false;
let authCalls = 0;
let writes = 0;
let identityDatabaseError = false;
const serverPath = require.resolve("../src/lib/firebase/auth");
require(serverPath);
require.cache[serverPath]!.exports = { ...require(serverPath), getFirebaseAccount: async () => {
  authCalls++;
  if (temporaryAuthError || identityDatabaseError) throw new Error("private provider/database details");
  return identity && !authError && !anonymousSession ? { id: identity } : null;
} };
const account = require("../src/lib/saju/account") as typeof import("../src/lib/saju/account");
const { assertSameOrigin, readJsonBody, guardedMutation } = require("../src/lib/security/request") as typeof import("../src/lib/security/request");
const { profileInputSchema } = require("../src/lib/saju/profile-input") as typeof import("../src/lib/saju/profile-input");
const { restoreProfileDraft } = require("../src/lib/profile-draft") as typeof import("../src/lib/profile-draft");
const { safeReturnPath } = require("../src/lib/auth-return-path") as typeof import("../src/lib/auth-return-path");
const { parsePortOnePayment } = require("../src/lib/portone/server") as typeof import("../src/lib/portone/server");
const portonePath = require.resolve("../src/lib/portone/server");
require.cache[portonePath]!.exports = { ...require(portonePath), getPortOnePayment: async () => { paymentCalls++; return parsePortOnePayment(provider, provider.id, "store-test"); } };
const { verifySajuPayment } = require("../src/lib/saju/library-service") as typeof import("../src/lib/saju/library-service");
const { POLICY_VERSION, recordCheckoutConsent } = require("../src/lib/commerce/policy") as typeof import("../src/lib/commerce/policy");
const input = { name: "검사 인물", relationship: "SELF", gender: "female", birthDate: "1995-05-20", birthTime: "20:20", calendar: "solar", isLeapMonth: false };
const provider = { id: "saju_test-payment", storeId: "store-test", channel: { key: "channel-test", type: "LIVE" }, amount: { total: 3900, cancelled: 0 }, currency: "KRW", status: "PAID" };
let paymentStatus = "READY";
let profileOwner: string | null = "A";
let reportOwner = "A";
let rateBlocked = false;
const reportStatus = "PENDING";
let paymentCalls = 0;
let generationCalls = 0;
let reportCount = 0;
let cancelBetweenReadAndWrite = false;
const order = () => ({ id: "order-fixture", merchantUid: provider.id, userId: "A", amount: 3900, status: paymentStatus, paidAt: null, product: { id: "product-fixture", price: 3900, code: "yearly_2026", active: true }, sajuProfileId: "profile-fixture", sajuProfile: { userId: profileOwner } });
store.consumeRateLimit = async () => !rateBlocked;
store.getProfile = (async () => ({ id: "profile-fixture", userId: profileOwner })) as never;
store.getProduct = (async () => order().product) as never;
store.getOrder = (async () => {
  const found = { ...order(), productCode: "yearly_2026" };
  if (cancelBetweenReadAndWrite) paymentStatus = "CANCELLED";
  return found;
}) as never;
store.prepareOrder = (async (userId: string, _profileId: string, _metadata: unknown, consent: unknown) => {
  if (userId !== profileOwner) throw new Error("PROFILE_NOT_FOUND");
  if (paymentStatus !== "PAID") recordCheckoutConsent(consent, "synthetic", 3900);
  return paymentStatus === "PAID" ? { existing: true, reportId: "report-fixture" } : { existing: false, orderId: provider.id, amount: 3900, orderName: "synthetic" };
}) as never;
store.ensureReport = (async () => { reportCount++; return { id: "report-fixture", status: reportStatus }; }) as never;
store.fulfillOrder = (async (_uid: string, _id: string, payment: Parameters<typeof verifySajuPayment>[1]) => {
  if (paymentStatus === "CANCELLED") throw new Error("ORDER_CANCELLED");
  verifySajuPayment(order(), payment);
  writes++; paymentStatus = "PAID"; reportCount++;
  return { id: "report-fixture" };
}) as never;
store.cancelOrder = async () => { writes++; paymentStatus = "CANCELLED"; };
// This suite stubs persistence; real reconciliation leases/races are covered by
// payment:reconciliation-check against isolated Firestore documents.
store.beginPaymentCheck = (async (_uid: string, _id: string, force: boolean) => ({ kind: paymentStatus !== "PAID" ? "denied" : force ? "claimed" : "cached", checkId: "fixture-check", order: order() })) as never;
store.finishPaymentCheck = (async (_uid: string, _id: string, _check: string, outcome: string) => {
  if (outcome === "cancelled") { writes++; paymentStatus = "CANCELLED"; }
  return { applied: true, order: order() };
}) as never;
store.getReportWithAccess = (async () => ({ id: "report-fixture", status: reportStatus, content: { paragraphs: ["synthetic-private-report"] }, sajuProfile: { userId: reportOwner }, order: { userId: "A", status: paymentStatus } })) as never;
store.saveProfile = (async () => { writes++; throw new Error("private database details internal.example"); }) as never;
const generationPath = require.resolve("../src/lib/llm/report-generator");
require(generationPath);
require.cache[generationPath]!.exports = { ...require(generationPath), generateReport: async () => { generationCalls++; } };
const profiles = require("../src/app/api/saju/profiles/route") as typeof import("../src/app/api/saju/profiles/route");
const sessionAccount = require("../src/app/api/auth/account/route") as typeof import("../src/app/api/auth/account/route");
const prepare = require("../src/app/api/saju/payments/prepare/route") as typeof import("../src/app/api/saju/payments/prepare/route");
const confirm = require("../src/app/api/saju/payments/confirm/route") as typeof import("../src/app/api/saju/payments/confirm/route");
const report = require("../src/app/api/saju/reports/[reportId]/route") as typeof import("../src/app/api/saju/reports/[reportId]/route");
const opened = require("../src/app/api/saju/reports/[reportId]/opened/route") as typeof import("../src/app/api/saju/reports/[reportId]/opened/route");
let receiptCalls = 0;
store.markReportReceipt = async (userId: string) => { receiptCalls++; return userId === reportOwner && paymentStatus === "PAID"; };
const generate = require("../src/app/api/saju/reports/[reportId]/generate/route") as typeof import("../src/app/api/saju/reports/[reportId]/generate/route");
const createReport = require("../src/app/api/saju/profiles/[profileId]/reports/route") as typeof import("../src/app/api/saju/profiles/[profileId]/reports/route");
const webhook = require("../src/app/api/saju/payments/webhook/route") as typeof import("../src/app/api/saju/payments/webhook/route");
const reportParams = { params: Promise.resolve({ reportId: "report-fixture" }) };
const profileParams = { params: Promise.resolve({ profileId: "profile-fixture" }) };
function request(path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://dabom.test${path}`, { method: "POST", headers: { origin: "https://dabom.test", "content-type": "application/json", ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
function signedWebhook(body: unknown, options: { timestamp?: number; signature?: string; raw?: string } = {}) {
  const raw = options.raw ?? JSON.stringify(body);
  const timestamp = String(options.timestamp ?? Math.floor(Date.now() / 1000));
  const id = "synthetic-event";
  const signature = options.signature ?? createHmac("sha256", signingKey).update(`${id}.${timestamp}.${raw}`).digest("base64");
  return new Request("https://dabom.test/api/saju/payments/webhook", { method: "POST", body: raw, headers: { "content-type": "application/json", "webhook-id": id, "webhook-timestamp": timestamp, "webhook-signature": `v1,${signature}` } });
}

async function main() {
  const draft = JSON.stringify({ accountId: "A", input });
  check("same account can restore its validated profile draft", restoreProfileDraft(draft, "A")?.name === input.name);
  const oldTopicDraft = JSON.stringify({ accountId: "A", input: { ...input, focusTopics: ["career", "money"] } });
  const restoredOldDraft = restoreProfileDraft(oldTopicDraft, "A");
  check("old interest selections are dropped while valid birth input is restored", restoredOldDraft?.name === input.name && restoredOldDraft.birthDate === input.birthDate && !("focusTopics" in restoredOldDraft));
  check("old interest drafts remain isolated by account", restoreProfileDraft(oldTopicDraft, "B") === null);
  check("B cannot restore late A draft", restoreProfileDraft(draft, "B") === null);
  check("legacy unscoped birth/name draft is discarded", restoreProfileDraft(JSON.stringify(input), "B") === null);
  check("malformed draft never exposes input", restoreProfileDraft("{", "A") === null);
  check("no verified account cannot restore a draft", restoreProfileDraft(draft, "") === null);
  check("non-string draft account cannot impersonate owner", restoreProfileDraft(JSON.stringify({ accountId: ["A"], input }), "A") === null);
  check("invalid birth data is not restored", restoreProfileDraft(JSON.stringify({ accountId: "A", input: { ...input, birthDate: "2026-02-31" } }), "A") === null);
  check("server validates user rather than trusting session", (await account.getSajuAccount())?.id === "A" && authCalls === 1);
  authError = true; const initialWrites = writes;
  check("forged/expired token cannot create account", await account.getSajuAccount() === null && writes === initialWrites);
  authError = false;
  anonymousSession = true;
  check("Anonymous auth session is not a customer account", await account.getSajuAccount() === null && writes === initialWrites);
  anonymousSession = false;
  const beforeIdentityWrites = writes;
  let identityResponse = await sessionAccount.GET();
  check("privacy identity endpoint returns only verified account ID", identityResponse.status === 200 && JSON.stringify(await identityResponse.json()) === '{"accountId":"A"}');
  check("privacy identity endpoint uses private no-store", identityResponse.headers.get("cache-control") === "private, no-store");
  check("privacy identity revalidation never creates or updates an account", writes === beforeIdentityWrites);
  identity = null;
  check("privacy identity endpoint rejects logged-out session", (await sessionAccount.GET()).status === 401);
  identity = "A"; anonymousSession = true;
  check("privacy identity endpoint rejects anonymous auth", (await sessionAccount.GET()).status === 401);
  anonymousSession = false; authError = true;
  check("privacy identity endpoint rejects invalid token", (await sessionAccount.GET()).status === 401);
  authError = false; identityDatabaseError = true;
  identityResponse = await sessionAccount.GET();
  check("privacy identity database failure exposes no internal error", identityResponse.status === 503 && !JSON.stringify(await identityResponse.json()).includes("private database"));
  identityDatabaseError = false;
  temporaryAuthError = true;
  identityResponse = await sessionAccount.GET();
  check("temporary Auth failure hides content without treating it as logout", identityResponse.status === 503 && !JSON.stringify(await identityResponse.json()).includes("private provider"));
  temporaryAuthError = false;
  for (const value of ["//evil.test", "/\\evil.test", "https://evil.test", "javascript:alert(1)", "//dabom.invalid@evil.test", "/\n/evil.test", "/..//evil.test", "/x/..//evil.test", "/%2e%2e//evil.test", "/.%2e//evil.test", "/x/%2E%2E//evil.test"]) check(`unsafe redirect rejected ${JSON.stringify(value)}`, safeReturnPath(value) === "/");
  check("ordinary login returns to the home page", safeReturnPath(null) === "/" && safeReturnPath("") === "/");
  check("internal return path preserved", safeReturnPath("/saju?x=1#top") === "/saju?x=1#top");
  check("interrupted purchase can resume after login", safeReturnPath("/saju/checkout/return?orderId=fixture") === "/saju/checkout/return?orderId=fixture");
  const { createElement } = require("react") as typeof import("react");
  const { renderToStaticMarkup } = require("react-dom/server") as typeof import("react-dom/server");
  const { QueryProvider } = require("../src/components/providers/query-provider") as typeof import("../src/components/providers/query-provider");
  const { AccountPrivacyBoundary } = require("../src/components/AccountPrivacyBoundary") as typeof import("../src/components/AccountPrivacyBoundary");
  const { TopNav } = require("../src/components/TopNav") as typeof import("../src/components/TopNav");
  const renderWithQueries = (node: import("react").ReactNode) => renderToStaticMarkup(createElement(QueryProvider, { children: node }));
  const privateMarker = "private-account-fixture@example.test";
  const protectedInitialHtml = renderWithQueries(createElement(AccountPrivacyBoundary, { accountId: "A", returnPath: "/saju/library", children: privateMarker }));
  check("private pages stay hidden until browser identity revalidation", !protectedInitialHtml.includes(privateMarker) && protectedInitialHtml.includes('aria-busy="true"'));
  const navInitialHtml = renderWithQueries(createElement(AccountPrivacyBoundary, { accountId: "A", returnPath: "/", compact: true, publicFallback: createElement(TopNav, { loggedIn: true, showLibraryLink: false }), children: privateMarker }));
  check("logout renders before hydration without exposing account details", navInitialHtml.includes("로그아웃") && !navInitialHtml.includes(privateMarker) && !navInitialHtml.includes('aria-busy="true"'));
  const LandingPage = require("../src/app/(public)/page").default as typeof import("../src/app/(public)/page").default;
  const loggedInHome = renderWithQueries(await LandingPage());
  check("authenticated home includes one logout button in its first HTML", (loggedInHome.match(/로그아웃/gu) ?? []).length === 1);
  identity = null;
  const guestHome = renderWithQueries(await LandingPage());
  check("guest home initially renders login instead of logout", guestHome.includes('href="/login"') && !guestHome.includes("로그아웃"));
  identity = "A";
  const { MessageReport } = require("../src/components/MessageReport") as typeof import("../src/components/MessageReport");
  const xssHtml = renderToStaticMarkup(createElement(MessageReport, { content: { paragraphs: ['<img src=x onerror="alert(1)">', '<script>alert(1)</script>'], meta: { charCount: 0, beats: [], termsUsed: [] } } }));
  check("model/report HTML is escaped rather than executed", !xssHtml.includes('<img src=x') && !xssHtml.includes('<script>') && xssHtml.includes('&lt;script&gt;'));
  const { KoreanPolicyAdapter } = require("../src/lib/saju/korean-policy-adapter") as typeof import("../src/lib/saju/korean-policy-adapter");
  const { buildReportRenderPayload } = require("../src/lib/saju/report-payload") as typeof import("../src/lib/saju/report-payload");
  const facts = new KoreanPolicyAdapter().calculate({ ...input, gender: "female", calendar: "solar" });
  const evidence = JSON.stringify(buildReportRenderPayload(facts).payload);
  check("LLM evidence omits exact birth date, time and display name", !evidence.includes(input.birthDate) && !evidence.includes(input.birthTime) && !evidence.includes(input.name));
  for (const origin of ["https://evil.test", "null", "https://dabom.test.evil.test", "https://dabom.test@evil.test"]) check(`cross-origin blocked ${origin}`, (await guardedMutation(request("/x", {}, { origin }), async () => new Response("unsafe"))).status === 403);
  check("cross-site fetch metadata denied", (await guardedMutation(request("/x", {}, { "sec-fetch-site": "cross-site" }), async () => new Response())).status === 403);
  assertSameOrigin(request("/x")); check("same-origin allowed", true);
  for (const birthDate of ["0000-01-01", "9999-01-01", "2025-02-29", "2026-02-31", "2026-13-01", "1995-05-20 OR 1=1"]) check(`invalid birth rejected ${birthDate}`, !profileInputSchema.safeParse({ ...input, birthDate }).success);
  for (const field of [{ name: "a".repeat(41) }, { name: "abc\u202Edef" }, { birthTime: "24:00" }, { gender: "admin" }, { relationship: "ADMIN" }]) check("invalid profile field rejected", !profileInputSchema.safeParse({ ...input, ...field }).success);
  check("stale clients cannot persist interest selections", !("focusTopics" in profileInputSchema.parse({ ...input, focusTopics: ["career"] })));
  const massAssigned = profileInputSchema.parse({ ...input, userId: "B", status: "PAID", orderId: "stolen", role: "admin", developmentPreviewAccess: { userId: "B", grantedAt: new Date().toISOString() } });
  check("owner/payment/preview grant fields cannot be mass assigned", !("userId" in massAssigned) && !("status" in massAssigned) && !("developmentPreviewAccess" in massAssigned));
  await assert.rejects(() => readJsonBody(request("/x", {}, { "content-type": "text/plain" }))); check("simple cross-site form content type denied", true);
  await assert.rejects(() => readJsonBody(request("/x", { value: "x".repeat(9000) }))); check("oversized streamed body denied without Content-Length", true);
  await assert.rejects(() => readJsonBody(request("/x", {}, { "content-length": "9000" }))); check("oversized declared body denied", true);
  await assert.rejects(() => readJsonBody(new Request("https://dabom.test/x", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }))); check("malformed JSON denied", true);
  const stalled = new Request("https://dabom.test/x", { method: "POST", headers: { "content-type": "application/json" }, body: new ReadableStream({ pull: () => new Promise(() => {}) }), duplex: "half" } as RequestInit & { duplex: "half" });
  await assert.rejects(() => readJsonBody(stalled), error => error instanceof Error && "status" in error && error.status === 408);
  check("stalled body has a bounded read deadline", true);
  for (const patch of [{ id: "another" }, { storeId: "different" }, { id: undefined }, { amount: { total: -1 } }, { amount: { total: 0.1 } }, { amount: { total: 3900, cancelled: 1 } }]) { assert.throws(() => parsePortOnePayment({ ...provider, ...patch }, provider.id, "store-test")); check("malformed/mismatched/refunded provider response denied", true); }
  for (const channel of [undefined, { key: "other-channel", type: "LIVE" }, { key: "channel-test", type: "TEST" }]) { assert.throws(() => parsePortOnePayment({ ...provider, channel }, provider.id, "store-test")); check("missing/wrong/test payment channel denied in production", true); }
  for (const patch of [{ id: "stolen" }, { amount: 1 }, { amount: NaN }, { amount: Infinity }, { amount: 0 }, { currency: "USD" }, { status: "READY" }, { status: "CANCELLED" }, { status: "PARTIAL_CANCELLED" }]) { assert.throws(() => verifySajuPayment(order(), { id: provider.id, amount: 3900, status: "PAID", currency: "KRW", ...patch })); check("unpaid or manipulated payment denied", true); }

  identity = null;
  for (const [name, invoke] of [
    ["profiles", () => profiles.POST(request("/api/saju/profiles", input))],
    ["prepare", () => prepare.POST(request("/api/saju/payments/prepare", { profileId: "profile-fixture" }))],
    ["confirm", () => confirm.POST(request("/api/saju/payments/confirm", { orderId: provider.id, paymentId: provider.id }))],
    ["report", () => report.GET(new Request("https://dabom.test/report"), reportParams)],
    ["opened", () => opened.POST(request("/opened"), reportParams)],
    ["generate", () => generate.POST(request("/generate"), reportParams)],
    ["create report", () => createReport.POST(request("/create"), profileParams)],
  ] as const) check(`anonymous ${name} denied`, (await invoke()).status === 401);
  check("anonymous requests make no provider or LLM call", paymentCalls === 0 && generationCalls === 0);
  identity = "B";
  check("cross-account report read denied", (await report.GET(new Request("https://dabom.test/report"), reportParams)).status === 404);
  check("cross-account opened receipt denied", (await opened.POST(request("/opened"), reportParams)).status === 404);
  check("cross-account generation denied", (await generate.POST(request("/generate"), reportParams)).status === 404);
  check("cross-account report creation denied", (await createReport.POST(request("/create"), profileParams)).status === 404);
  check("cross-account checkout denied", (await prepare.POST(request("/prepare", { profileId: "profile-fixture" }))).status === 404);
  check("cross-account payment confirmation denied", (await confirm.POST(request("/confirm", { orderId: provider.id, paymentId: provider.id }))).status === 404);
  check("IDOR makes no provider or LLM call", paymentCalls === 0 && generationCalls === 0);
  identity = "A";
  check("unpaid report denied in production", (await report.GET(new Request("https://dabom.test/report"), reportParams)).status === 404);
  for (const consent of [undefined, { version: "outdated", terms: true, digitalContent: true }, { version: POLICY_VERSION, terms: true, digitalContent: false }]) {
    check("payment API rejects missing/stale/incomplete consent before provider call", (await prepare.POST(request("/prepare", { profileId: "profile-fixture", consent }))).status === 400 && paymentCalls === 0);
  }
  provider.status = "READY";
  check("draft policies block new live checkout even with valid consent", (await prepare.POST(request("/prepare", { profileId: "profile-fixture", consent: { version: POLICY_VERSION, terms: true, digitalContent: true } }))).status === 503 && paymentStatus === "READY");
  provider.status = "PAID";
  paymentCalls = 0;
  check("unpaid opened receipt denied", (await opened.POST(request("/opened"), reportParams)).status === 404);
  const receiptCallsBefore = receiptCalls;
  check("cross-origin opening cannot write a receipt", (await opened.POST(request("/opened", undefined, { origin: "https://evil.test" }), reportParams)).status === 403 && receiptCalls === receiptCallsBefore);
  check("production has no free-report endpoint", (await createReport.POST(request("/create"), profileParams)).status === 402);
  check("unpaid generation denied", (await generate.POST(request("/generate"), reportParams)).status === 404);
  const ordinaryReportRead = store.getReportWithAccess;
  const preview = { id: "report-fixture", userId: "A", orderId: null, sajuProfileId: "profile-fixture", productCode: "yearly_2026", status: "COMPLETED", content: { paragraphs: ["synthetic-preview"] }, sajuProfile: { userId: "A" }, order: null, developmentPreviewAccess: { userId: "A", grantedAt: new Date().toISOString() } };
  store.getReportWithAccess = (async () => preview) as never;
  check("explicit completed preview is readable by its owner", (await report.GET(new Request("https://dabom.test/report"), reportParams)).status === 200);
  check("preview duplicate returns existing report without generation", (await createReport.POST(request("/create"), profileParams)).status === 200 && reportCount === 0);
  check("preview purchase preparation returns existing without payment calls", (await prepare.POST(request("/prepare", { profileId: "profile-fixture" }))).status === 200 && paymentCalls === 0);
  const CheckoutPage = require("../src/app/saju/profiles/[profileId]/checkout/page").default as typeof import("../src/app/saju/profiles/[profileId]/checkout/page").default;
  await assert.rejects(() => CheckoutPage(profileParams), error => error instanceof Error && "digest" in error && String(error.digest).includes(";/saju/reports/report-fixture;"));
  check("old checkout link reopens a granted report without a redirect loop", true);
  check("completed preview generation endpoint is idempotent", (await generate.POST(request("/generate"), reportParams)).status === 200 && generationCalls === 0);
  identity = "B";
  check("another account cannot read granted preview", (await report.GET(new Request("https://dabom.test/report"), reportParams)).status === 404);
  identity = "A";
  for (const patch of [
    { developmentPreviewAccess: undefined },
    { developmentPreviewAccess: { userId: "B", grantedAt: new Date().toISOString() } },
    { developmentPreviewAccess: { userId: "A", grantedAt: "invalid" } },
    { userId: "B" }, { status: "PENDING" }, { status: "FAILED" }, { content: null },
    { orderId: "cancelled-order", order: { userId: "A", status: "CANCELLED" } },
  ]) check("preview grant cannot bypass ownership, payment revocation or generation", !account.canReadSajuReport({ ...preview, ...patch }, { id: "A" }, false));
  store.getReportWithAccess = ordinaryReportRead;
  check("client paymentId swapping denied before provider lookup", (await confirm.POST(request("/confirm", { orderId: provider.id, paymentId: "stolen" }))).status === 400 && paymentCalls === 0);
  provider.amount.total = 1;
  check("server catches amount fraud", (await confirm.POST(request("/confirm", { orderId: provider.id, paymentId: provider.id, status: "PAID", amount: 3900 }))).status === 409 && paymentStatus === "READY");
  provider.amount.total = 3900;
  const paid = await confirm.POST(request("/confirm", { orderId: provider.id, paymentId: provider.id }));
  check("verified payment grants report", paid.status === 200 && paymentStatus === "PAID");
  check("paid owner opening accepted without content response", (await opened.POST(request("/opened"), reportParams)).status === 204);
  check("existing purchase opens while commerce policies remain draft", (await prepare.POST(request("/prepare", { profileId: "profile-fixture" }))).status === 200);
  const countBeforeRetry = reportCount;
  const replay = await confirm.POST(request("/confirm", { orderId: provider.id, paymentId: provider.id }));
  check("payment retry returns same report", replay.status === 200 && (await replay.json()).reportId === "report-fixture" && reportCount === countBeforeRetry + 1);
  const read = await report.GET(new Request("https://dabom.test/report"), reportParams);
  check("paid owner reads private uncached report", read.status === 200 && read.headers.get("cache-control") === "private, no-store");
  rateBlocked = true;
  const generationBefore = generationCalls;
  check("generation abuse limited before LLM", (await generate.POST(request("/generate"), reportParams)).status === 429 && generationCalls === generationBefore);
  check("profile abuse limited before calculation/write", (await profiles.POST(request("/profiles", input))).status === 429);
  check("payment lookup abuse limited", (await confirm.POST(request("/confirm", { orderId: provider.id, paymentId: provider.id }))).status === 429);
  rateBlocked = false;
  const savedRead = store.getReportWithAccess;
  store.getReportWithAccess = async () => null;
  const failure = await profiles.POST(request("/profiles", input));
  check("database error never leaks connection/SQL details", failure.status === 503 && !/postgres|secret|internal\.example/u.test(await failure.text()));
  store.getReportWithAccess = savedRead;
  check("cross-site profile write denied before auth", (await profiles.POST(request("/profiles", input, { origin: "https://evil.test" }))).status === 403);

  const event = { type: "Transaction.Cancelled", timestamp: new Date().toISOString(), data: { storeId: "store-test", paymentId: provider.id, transactionId: "synthetic-tx", cancellationId: "synthetic-cancellation" } };
  let before = writes;
  check("unsigned webhook denied without DB mutation", (await webhook.POST(request("/webhook", event))).status === 400 && writes === before);
  check("forged signature denied", (await webhook.POST(signedWebhook(event, { signature: "invalid" }))).status === 400 && writes === before);
  check("expired signature denied", (await webhook.POST(signedWebhook(event, { timestamp: Math.floor(Date.now() / 1000) - 1000 }))).status === 400 && writes === before);
  check("future signature denied", (await webhook.POST(signedWebhook(event, { timestamp: Math.floor(Date.now() / 1000) + 1000 }))).status === 400 && writes === before);
  check("signed wrong-store event denied", (await webhook.POST(signedWebhook({ ...event, data: { ...event.data, storeId: "other" } }))).status === 400 && writes === before);
  const response = await webhook.POST(signedWebhook(event));
  check("webhook event alone cannot fake cancellation", response.status === 200 && paymentStatus === "PAID");
  provider.status = "CANCELLED";
  check("verified cancellation removes entitlement", (await webhook.POST(signedWebhook(event))).status === 200 && paymentStatus === "CANCELLED");
  check("cancelled report access denied", (await report.GET(new Request("https://dabom.test/report"), reportParams)).status === 404);
  check("cancelled report generation denied", (await generate.POST(request("/generate"), reportParams)).status === 404);
  before = writes;
  provider.status = "PAID";
  check("delayed Paid event acknowledged without reactivating cancellation", (await webhook.POST(signedWebhook({ ...event, type: "Transaction.Paid" }))).status === 200 && paymentStatus === "CANCELLED" && writes === before);
  check("payment replay cannot reactivate cancelled order", (await confirm.POST(request("/confirm", { orderId: provider.id, paymentId: provider.id }))).status === 409 && paymentStatus === "CANCELLED");
  paymentStatus = "READY"; cancelBetweenReadAndWrite = true;
  check("cancellation between read and update cannot be overwritten", (await confirm.POST(request("/confirm", { orderId: provider.id, paymentId: provider.id }))).status === 409 && paymentStatus === "CANCELLED");
  cancelBetweenReadAndWrite = false;
  for (const file of ["payments/prepare", "payments/confirm", "reports/create", "letters/create", "saju/test"]) check(`retired ${file} closed`, (await require(`../src/app/api/${file}/route`).POST()).status === 410);
  check("retired report lookup closed", (await require("../src/app/api/reports/[id]/route").GET()).status === 410);
  profileOwner = null; reportOwner = "B";
  check("orphan profile cannot be claimed", (await createReport.POST(request("/create"), profileParams)).status === 404);
  console.log(`\n${passed} PASS (synthetic accounts and mocked providers; no external requests)`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
