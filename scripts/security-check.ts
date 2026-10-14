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
const { prisma } = require("../src/lib/db") as typeof import("../src/lib/db");
let identity: string | null = "A";
let authError = false;
let temporaryAuthError = false;
let anonymousSession = false;
let authCalls = 0;
let writes = 0;
const serverPath = require.resolve("../src/lib/supabase/server");
require(serverPath);
require.cache[serverPath]!.exports = { createClient: async () => ({ auth: {
  getUser: async () => { authCalls++; return { data: { user: identity ? { id: identity, is_anonymous: anonymousSession, user_metadata: {} } : null }, error: temporaryAuthError ? Object.assign(new Error("private provider details"), { name: "AuthRetryableFetchError", status: 503 }) : authError ? new Error("bad token") : null }; },
  getSession: () => { throw new Error("Unverified session must not authorize a request"); },
  signOut: async () => ({ error: null }),
} }) };
prisma.user.upsert = (async () => { writes++; return { id: identity }; }) as never;
let identityDatabaseError = false;
prisma.user.findUnique = (async () => {
  if (identityDatabaseError) throw new Error("private database details must remain private");
  return identity ? { id: identity } : null;
}) as never;
const account = require("../src/lib/saju/account") as typeof import("../src/lib/saju/account");
const { assertSameOrigin, readJsonBody, guardedMutation } = require("../src/lib/security/request") as typeof import("../src/lib/security/request");
const { profileInputSchema } = require("../src/lib/saju/profile-input") as typeof import("../src/lib/saju/profile-input");
const { restoreProfileDraft } = require("../src/lib/profile-draft") as typeof import("../src/lib/profile-draft");
const { safeReturnPath } = require("../src/lib/auth-return-path") as typeof import("../src/lib/auth-return-path");
const { parsePortOnePayment } = require("../src/lib/portone/server") as typeof import("../src/lib/portone/server");
const { verifySajuPayment } = require("../src/lib/saju/library-service") as typeof import("../src/lib/saju/library-service");
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
prisma.$queryRaw = (async () => rateBlocked ? [] : [{ hits: 1 }]) as never;
prisma.sajuProfile.findUnique = (async () => ({ id: "profile-fixture", userId: profileOwner })) as never;
prisma.sajuProfile.findFirst = (async ({ where }: { where: { userId: string } }) => where.userId === profileOwner ? { id: "profile-fixture" } : null) as never;
prisma.product.findUnique = (async () => order().product) as never;
prisma.order.findFirst = (async ({ where }: { where: { userId?: string; merchantUid?: string } }) => {
  const found = (!where.userId || where.userId === "A") && (!where.merchantUid || where.merchantUid === provider.id) ? order() : null;
  if (cancelBetweenReadAndWrite) paymentStatus = "CANCELLED";
  return found;
}) as never;
prisma.order.upsert = (async () => ({ ...order(), report: paymentStatus === "PAID" ? { id: "report-fixture" } : null })) as never;
prisma.order.update = (async ({ data }: { data: { status: string } }) => { writes++; paymentStatus = data.status; return order(); }) as never;
prisma.order.updateMany = (async ({ where, data }: { where?: { status?: { not: string } }; data: { status: string } }) => {
  if (where?.status?.not === paymentStatus) return { count: 0 };
  writes++; paymentStatus = data.status; return { count: 1 };
}) as never;
prisma.report.upsert = (async () => { reportCount++; return { id: "report-fixture", status: reportStatus }; }) as never;
prisma.report.findUnique = (async () => ({ id: "report-fixture", status: reportStatus, content: { paragraphs: ["synthetic-private-report"] }, sajuProfile: { userId: reportOwner }, order: { userId: "A", status: paymentStatus } })) as never;
prisma.report.findFirst = (async () => null) as never;
prisma.sajuProfile.update = (async () => { writes++; throw new Error("postgresql://hidden:secret@internal.example/private"); }) as never;
prisma.$transaction = (async (fn: (tx: typeof prisma) => unknown) => fn(prisma)) as never;
const portonePath = require.resolve("../src/lib/portone/server");
require.cache[portonePath]!.exports = { ...require(portonePath), getPortOnePayment: async () => { paymentCalls++; return parsePortOnePayment(provider, provider.id, "store-test"); } };
const generationPath = require.resolve("../src/lib/llm/report-generator");
require(generationPath);
require.cache[generationPath]!.exports = { ...require(generationPath), generateReport: async () => { generationCalls++; } };
const profiles = require("../src/app/api/saju/profiles/route") as typeof import("../src/app/api/saju/profiles/route");
const sessionAccount = require("../src/app/api/auth/account/route") as typeof import("../src/app/api/auth/account/route");
const prepare = require("../src/app/api/saju/payments/prepare/route") as typeof import("../src/app/api/saju/payments/prepare/route");
const confirm = require("../src/app/api/saju/payments/confirm/route") as typeof import("../src/app/api/saju/payments/confirm/route");
const report = require("../src/app/api/saju/reports/[reportId]/route") as typeof import("../src/app/api/saju/reports/[reportId]/route");
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
  check("Supabase anonymous auth session is not a customer account", await account.getSajuAccount() === null && writes === initialWrites);
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
  for (const value of ["//evil.test", "/\\evil.test", "https://evil.test", "javascript:alert(1)", "//dabom.invalid@evil.test", "/\n/evil.test", "/..//evil.test", "/x/..//evil.test", "/%2e%2e//evil.test", "/.%2e//evil.test", "/x/%2E%2E//evil.test"]) check(`unsafe redirect rejected ${JSON.stringify(value)}`, safeReturnPath(value) === "/saju/library");
  check("internal return path preserved", safeReturnPath("/saju?x=1#top") === "/saju?x=1#top");
  const { createElement } = require("react") as typeof import("react");
  const { renderToStaticMarkup } = require("react-dom/server") as typeof import("react-dom/server");
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
  const massAssigned = profileInputSchema.parse({ ...input, userId: "B", status: "PAID", orderId: "stolen", role: "admin" });
  check("owner/payment fields cannot be mass assigned", !("userId" in massAssigned) && !("status" in massAssigned));
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
    ["generate", () => generate.POST(request("/generate"), reportParams)],
    ["create report", () => createReport.POST(request("/create"), profileParams)],
  ] as const) check(`anonymous ${name} denied`, (await invoke()).status === 401);
  check("anonymous requests make no provider or LLM call", paymentCalls === 0 && generationCalls === 0);
  identity = "B";
  check("cross-account report read denied", (await report.GET(new Request("https://dabom.test/report"), reportParams)).status === 404);
  check("cross-account generation denied", (await generate.POST(request("/generate"), reportParams)).status === 404);
  check("cross-account report creation denied", (await createReport.POST(request("/create"), profileParams)).status === 404);
  check("cross-account checkout denied", (await prepare.POST(request("/prepare", { profileId: "profile-fixture" }))).status === 404);
  check("cross-account payment confirmation denied", (await confirm.POST(request("/confirm", { orderId: provider.id, paymentId: provider.id }))).status === 404);
  check("IDOR makes no provider or LLM call", paymentCalls === 0 && generationCalls === 0);
  identity = "A";
  check("unpaid report denied in production", (await report.GET(new Request("https://dabom.test/report"), reportParams)).status === 404);
  check("production has no free-report endpoint", (await createReport.POST(request("/create"), profileParams)).status === 402);
  check("unpaid generation denied", (await generate.POST(request("/generate"), reportParams)).status === 404);
  check("client paymentId swapping denied before provider lookup", (await confirm.POST(request("/confirm", { orderId: provider.id, paymentId: "stolen" }))).status === 400 && paymentCalls === 0);
  provider.amount.total = 1;
  check("server catches amount fraud", (await confirm.POST(request("/confirm", { orderId: provider.id, paymentId: provider.id, status: "PAID", amount: 3900 }))).status === 409 && paymentStatus === "READY");
  provider.amount.total = 3900;
  const paid = await confirm.POST(request("/confirm", { orderId: provider.id, paymentId: provider.id }));
  check("verified payment grants report", paid.status === 200 && paymentStatus === "PAID");
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
  const failure = await profiles.POST(request("/profiles", input));
  check("database error never leaks connection/SQL details", failure.status === 503 && !/postgres|secret|internal\.example/u.test(await failure.text()));
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
  check("delayed Paid event cannot reactivate cancellation", (await webhook.POST(signedWebhook({ ...event, type: "Transaction.Paid" }))).status === 503 && paymentStatus === "CANCELLED" && writes === before);
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

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
