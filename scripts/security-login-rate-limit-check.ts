import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

// No real Firestore, provider, credentials or user sessions are used.
globalThis.fetch = async () => { throw new Error("Unexpected network request"); };
const require = createRequire(import.meta.url);
const testEnv = process.env as Record<string, string | undefined>;
testEnv.NODE_ENV = "production";
testEnv.VERCEL = "1";
testEnv.NEXT_PUBLIC_APP_URL = "https://dabom.test";
const { createLoginRequestLimiter, loginClientAddress, LOGIN_REQUEST_LIMIT, LOGIN_REQUEST_WINDOW_MS } = require("../src/lib/security/login-rate-limit") as typeof import("../src/lib/security/login-rate-limit");
let passed = 0;
function check(name: string, condition: unknown) { assert.ok(condition, name); passed++; console.log(`PASS ${name}`); }
const request = (address?: string, suffix = "") => new Request(`https://dabom.test/api/auth/login${suffix}`, { headers: address ? { "x-forwarded-for": address } : {} });

async function main() {
  check("direct/local forwarding headers cannot choose a new bucket", loginClientAddress(request("192.0.2.1"), "direct") === loginClientAddress(request("192.0.2.2"), "direct"));
  check("Vercel verified addresses have separate buckets", loginClientAddress(request("192.0.2.1")) !== loginClientAddress(request("192.0.2.2")));
  check("equivalent IPv6 addresses share one bucket", loginClientAddress(request("2001:0db8:0000:0000:0000:0000:0000:0001")) === loginClientAddress(request("2001:db8::1")));
  for (const address of [undefined, "invalid", "192.0.2.1, 192.0.2.2", "x".repeat(100)]) {
    check("missing/malformed forwarded IP cannot create an arbitrary bucket", loginClientAddress(request(address)) === "untrusted-client");
  }
  const balancer = "35.219.200.50";
  const chain = `192.0.2.10, ${balancer}, 35.191.0.1`;
  const firebaseAddress = (value?: string) => loginClientAddress(request(value), "firebase-app-hosting", balancer);
  check("App Hosting extracts client before the pinned balancer and GFE", firebaseAddress(chain) === "192.0.2.10");
  check("App Hosting ignores arbitrary forged XFF prefixes", ["198.51.100.1", "198.51.100.2, 198.51.100.3", "unknown", `192.0.2.99, ${balancer}, 35.191.0.2`].every(prefix => firebaseAddress(`${prefix}, ${chain}`) === "192.0.2.10"));
  check("App Hosting changing GFE does not change client quota", firebaseAddress(chain.replace("35.191.0.1", "35.191.0.2")) === firebaseAddress(chain));
  check("App Hosting canonicalizes IPv6 clients", firebaseAddress(`2001:0db8:0000::1, ${balancer}, 35.191.0.1`) === firebaseAddress(`2001:db8::1, ${balancer}, 35.191.0.1`));
  for (const invalid of [undefined, "192.0.2.1", `192.0.2.1, ${balancer}`, "192.0.2.1, 198.51.100.1, 35.191.0.1", `unknown, ${balancer}, 35.191.0.1`, `192.0.2.1, ${balancer}, unknown`, `${"x".repeat(4096)}, ${chain}`]) {
    check("App Hosting malformed or unknown topology fails closed", firebaseAddress(invalid) === "untrusted-client");
  }
  check("App Hosting missing pinned balancers fails closed", loginClientAddress(request(chain), "firebase-app-hosting", "") === "untrusted-client");
  testEnv.DABOM_HOSTING = "firebase-app-hosting";
  testEnv.DABOM_APPHOSTING_LB_IPS = balancer;
  delete testEnv.VERCEL;
  check("App Hosting flag without Cloud Run context cannot trust headers", loginClientAddress(request(chain)) === "untrusted-client");
  testEnv.K_SERVICE = "dabom";
  check("App Hosting runtime selects verified proxy policy", loginClientAddress(request(chain)) === "192.0.2.10");
  delete testEnv.DABOM_HOSTING;
  delete testEnv.DABOM_APPHOSTING_LB_IPS;
  delete testEnv.K_SERVICE;
  testEnv.VERCEL = "1";
  let time = 0;
  const consume = createLoginRequestLimiter({ limit: 2, windowMs: 10_000, maxEntries: 2, now: () => time });
  check("initial requests accepted", consume("A").allowed && consume("A").allowed);
  check("excess request rejected with retry time", !consume("A").allowed && consume("A").retryAfter === 10);
  time = 9_500;
  check("retry seconds round up", consume("A").retryAfter === 1);
  check("another address has its own budget", consume("B").allowed);
  check("full map rejects new addresses without evicting active limits", !consume("C").allowed && !consume("A").allowed);
  time = 10_000;
  check("expired entry releases capacity", consume("C").allowed);
  check("other live bucket is not reset by cleanup", consume("B").allowed && !consume("B").allowed);
  time = 20_000;
  check("expired budget becomes usable again", consume("A").allowed);
  const concurrent = createLoginRequestLimiter();
  const admissions = await Promise.all(Array.from({ length: 100 }, async () => concurrent("one-ip")));
  check("parallel requests reserve exactly one shared per-process budget", admissions.filter(result => result.allowed).length === LOGIN_REQUEST_LIMIT);

  const rule = JSON.parse(readFileSync(new URL("./security/login-rate-limit-rule.json", import.meta.url), "utf8"));
  check("WAF and application use the same request/window limits", rule.action.mitigate.rateLimit.limit === LOGIN_REQUEST_LIMIT && rule.action.mitigate.rateLimit.window * 1000 === LOGIN_REQUEST_WINDOW_MS);
  check("WAF blocks by IP rather than logging or trusting client headers", rule.active && rule.action.mitigate.action === "rate_limit" && rule.action.mitigate.rateLimit.action === "rate_limit" && JSON.stringify(rule.action.mitigate.rateLimit.keys) === '["ip"]');
  const pathPattern = new RegExp(rule.conditionGroup[0].conditions[0].value);
  check("WAF covers login and its trailing slash", pathPattern.test("/api/auth/login") && pathPattern.test("/api/auth/login/"));
  check("WAF leaves callback, polling and payment webhooks outside its limit", ["/api/auth/callback", "/api/auth/account", "/api/saju/reports/example", "/api/saju/payments/webhook"].every(path => !pathPattern.test(path)));

  let dbCalls = 0, oauthCalls = 0, cookieReads = 0, sharedAllowed = true;
  const returnPaths: string[] = [];
  const { firebaseStore } = require("../src/lib/firebase/store") as typeof import("../src/lib/firebase/store");
  firebaseStore.consumeRateLimit = async () => { dbCalls++; return sharedAllowed; };
  const authPath = require.resolve("../src/lib/firebase/auth");
  const originalAuth = require(authPath);
  require.cache[authPath]!.exports = { ...originalAuth, firebaseAuthConfigured: () => true, beginKakaoLogin: async (next: string) => {
    returnPaths.push(next);
    oauthCalls++; return { url: "https://kauth.kakao.com/oauth/authorize", cookie: "synthetic-binding" };
  } };
  const headersPath = require.resolve("next/headers");
  require(headersPath);
  require.cache[headersPath]!.exports = { cookies: async () => { cookieReads++; return { get: () => undefined }; } };
  const { GET } = require("../src/app/api/auth/login/route") as typeof import("../src/app/api/auth/login/route");
  const responses = await Promise.all(Array.from({ length: 75 }, (_, i) => GET(request("192.0.2.10", `?next=/saju&attempt=${i}`))));
  check("route accepts first 30 attempts only", responses.filter(response => response.status === 307).length === 30 && responses.filter(response => response.status === 429).length === 45);
  check("45 rejected requests cause ZERO extra Firestore/OAuth/cookie calls", dbCalls === 30 && oauthCalls === 30 && cookieReads === 30);
  check("explicit interrupted flow return path is preserved", returnPaths.every(path => path === "/saju"));
  const rejected = responses.find(response => response.status === 429)!;
  check("blocked response is uncached and includes retry-after", rejected.headers.get("cache-control") === "private, no-store" && Number(rejected.headers.get("retry-after")) > 0 && !rejected.headers.has("set-cookie"));
  check("another IP can still begin login", (await GET(request("192.0.2.11"))).status === 307);
  check("login without next returns to the main page", returnPaths.at(-1) === "/");
  sharedAllowed = false;
  const beforeOAuth = oauthCalls;
  check("shared database limit is still enforced on a fresh process bucket", (await GET(request("192.0.2.12"))).status === 429 && oauthCalls === beforeOAuth);
  sharedAllowed = true;
  delete testEnv.VERCEL;
  const beforeDb = dbCalls;
  for (let i = 1; i <= 35; i++) await GET(request(`198.51.100.${i}`));
  check("spoofed forwarding headers cannot bypass local protection", dbCalls - beforeDb === 30);
  console.log(`\n${passed} PASS; no Firestore writes, provider requests or customer data used.`);
}
main().catch(error => { console.error(error instanceof assert.AssertionError ? error.message : "Login rate-limit regression failed."); process.exitCode = 1; });
