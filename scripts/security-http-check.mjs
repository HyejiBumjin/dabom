import assert from "node:assert/strict";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const origin = new URL(process.env.SECURITY_CHECK_URL || "http://127.0.0.1:3100");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname), "Only test a local server");
let passed = 0;
async function check(path, { method = "GET", status, headers = {}, body } = {}) {
  const response = await fetch(new URL(path, origin), { method, headers, body, redirect: "manual", signal: AbortSignal.timeout(20000) });
  const text = await response.text();
  assert.ok((Array.isArray(status) ? status : [status]).includes(response.status), `${method} ${path} returned ${response.status}`);
  assert.ok(!/postgresql:\/\/|OPENAI_API_KEY|PrismaClientKnownRequestError|synthetic-private-report/.test(text), "Response leaked internal details");
  passed++; console.log(`PASS ${method} ${path} => ${response.status}`);
  return response;
}
const api = [
  ["GET", "/api/auth/account"],
  ["POST", "/api/saju/profiles"], ["POST", "/api/saju/profiles/security-probe/reports"],
  ["GET", "/api/saju/reports/security-probe"], ["POST", "/api/saju/reports/security-probe/generate"],
  ["POST", "/api/saju/payments/prepare"], ["POST", "/api/saju/payments/confirm"],
];
async function main() {
  const home = await check("/", { status: 200 });
  for (const [name, expected] of [["x-content-type-options", "nosniff"], ["x-frame-options", "DENY"], ["referrer-policy", "no-referrer"]]) {
    assert.equal(home.headers.get(name), expected); passed++; console.log(`PASS security header ${name}`);
  }
  assert.ok(home.headers.get("content-security-policy")?.includes("frame-ancestors 'none'")); passed++;
  assert.ok(home.headers.get("strict-transport-security")?.includes("max-age=31536000")); passed++;
  assert.equal(home.headers.get("x-powered-by"), null); passed++;
  for (const [method, path] of api) {
    const response = await check(path, { method, status: 401, ...(method === "POST" ? { headers: { "content-type": "application/json" }, body: "{}" } : {}) });
    assert.equal(response.headers.get("cache-control"), "private, no-store"); passed++;
  }
  const subrequestHeaders = ["middleware", "src/middleware", "middleware:middleware:middleware:middleware:middleware", "src/proxy:src/proxy:src/proxy:src/proxy:src/proxy"];
  for (const value of subrequestHeaders) await check("/api/saju/reports/security-probe", { status: 401, headers: { "x-middleware-subrequest": value } });
  for (const headers of [
    { authorization: "Bearer forged-token" },
    { cookie: "dabom-owner=admin; userId=admin; role=admin" },
    { "x-user-id": "admin", "x-forwarded-user": "admin", "x-authenticated-user": "admin" },
  ]) await check("/api/saju/reports/security-probe", { status: 401, headers });
  const prefetchHeaders = { rsc: "1", "next-router-prefetch": "1" };
  const prefetch = await check("/api/saju/reports/security-probe", { status: [307, 401], headers: prefetchHeaders });
  if (prefetch.status === 307) {
    const canonical = new URL(prefetch.headers.get("location"), origin);
    assert.equal(canonical.origin, origin.origin);
    await check(canonical.pathname + canonical.search, { status: 401, headers: prefetchHeaders });
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
    const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
    const jwt = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: "00000000-0000-4000-8000-000000000000", role: "authenticated", exp: Math.floor(Date.now()/1000)+3600 })}.forged-signature`;
    const session = { access_token: jwt, refresh_token: "forged-refresh-token", expires_at: Math.floor(Date.now()/1000)+3600, expires_in: 3600, token_type: "bearer", user: { id: "00000000-0000-4000-8000-000000000000" } };
    await check("/api/saju/reports/security-probe", { status: 401, headers: { cookie: `sb-${project}-auth-token=base64-${encode(session)}` } });
  }
  for (const [method, path] of api.filter(([method]) => method === "POST")) await check(path, { method, status: 403, headers: { origin: "https://evil.invalid", "content-type": "application/json" }, body: "{}" });
  await check("/api/auth/logout", { method: "POST", status: 403, headers: { origin: "https://evil.invalid" } });
  for (const path of ["/saju", "/saju/library", "/saju/profiles/security-probe", "/saju/profiles/security-probe/checkout", "/saju/reports/security-probe", "/saju/checkout/return?orderId=probe"]) {
    const response = await check(path, { status: 307 });
    assert.equal(new URL(response.headers.get("location"), origin).pathname, "/login"); passed++;
  }
  for (const path of ["/api/payments/prepare", "/api/payments/confirm", "/api/reports/create", "/api/letters/create", "/api/saju/test"]) await check(path, { method: "POST", status: 410, headers: { "content-type": "application/json" }, body: "{}" });
  await check("/api/reports/00000000-0000-4000-8000-000000000000", { status: 410 });
  for (const path of ["/.env", "/.env.local", "/.git/config", "/prisma/schema.prisma", "/scripts/security-check.ts", "/preview/report", "/design/report-essay", "/saju/preview/library", "/saju/preview/checkout", "/saju/preview/loading", "/reports/00000000-0000-4000-8000-000000000000", "/gift/security-probe", "/checkout/success"]) await check(path, { status: 404 });
  await check("/_next/image?url=http%3A%2F%2Fexample.invalid%2Fprobe.png&w=640&q=75", { status: 400 });
  await check("/_next/image?url=http%3A%2F%2F127.0.0.1%3A3100%2F&w=640&q=75", { status: 400 });
  for (const [method, path] of [["GET", "/api/saju/payments/confirm"], ["DELETE", "/api/saju/profiles"], ["PUT", "/api/saju/reports/security-probe"]]) await check(path, { method, status: 405 });
  await check("/api/saju/payments/webhook", { method: "POST", status: [400, 503], headers: { "content-type": "application/json" }, body: '{"type":"Transaction.Paid","data":{"paymentId":"forged","storeId":"forged"}}' });
  const callback = await check("/api/auth/callback?next=%2F%2Fevil.invalid", { status: 307, headers: { "x-forwarded-host": "evil.invalid", "x-forwarded-proto": "https" } });
  const configuredOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").origin;
  assert.equal(new URL(callback.headers.get("location")).origin, configuredOrigin); passed++;
  console.log(`\n${passed} PASS against production HTTP server (no valid auth cookies, provider charges, or LLM calls)`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
