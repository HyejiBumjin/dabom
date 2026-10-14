import assert from "node:assert/strict";

// No cookies, real report IDs, valid profile input, payment, or model requests.
const origin = new URL(process.env.SAJU_AUTH_CHECK_URL || "http://localhost:3000");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname), "Run this check against the local development server.");

const pages = [
  "/saju",
  "/saju/library",
  "/saju/profiles/auth-check-profile",
  "/saju/profiles/auth-check-profile/checkout",
  "/saju/reports/auth-check-report",
  "/saju/checkout/return?orderId=auth-check-order&paymentId=auth-check-payment",
];
const apiRoutes = [
  ["POST", "/api/saju/profiles"],
  ["POST", "/api/saju/profiles/auth-check-profile/reports"],
  ["GET", "/api/saju/reports/auth-check-report"],
  ["POST", "/api/saju/reports/auth-check-report/generate"],
  ["POST", "/api/saju/payments/prepare"],
  ["POST", "/api/saju/payments/confirm"],
];

async function main() {
  let passed = 0;
  for (const path of pages) {
    const response = await fetch(new URL(path, origin), { redirect: "manual", signal: AbortSignal.timeout(20000) });
    assert.ok([307, 308].includes(response.status), `${path}: expected a login redirect, got ${response.status}`);
    const destination = new URL(response.headers.get("location"), origin);
    assert.equal(destination.origin, origin.origin);
    assert.equal(destination.pathname, "/login");
    assert.equal(destination.searchParams.get("next"), path, "Login must return to the requested page.");
    await response.body?.cancel();
    console.log(`PASS anonymous ${path} redirects to login with return path`);
    passed++;
  }
  for (const [method, path] of apiRoutes) {
    const response = await fetch(new URL(path, origin), {
      method, redirect: "manual", signal: AbortSignal.timeout(20000),
      ...(method === "POST" ? { headers: { "Content-Type": "application/json" }, body: "{}" } : {}),
    });
    assert.equal(response.status, 401, `${method} ${path}: expected 401, got ${response.status}`);
    const result = await response.json();
    assert.equal(typeof result.error, "string");
    assert.ok(!("content" in result) && !("reportId" in result) && !("profileId" in result));
    console.log(`PASS anonymous ${method} ${path} is blocked before data or generation`);
    passed++;
  }
  console.log(`\n${passed} PASS (no payment or LLM calls)`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
