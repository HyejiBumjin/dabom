import assert from "node:assert/strict";
import { createRequire } from "node:module";

// No real Firestore, provider, credentials or user sessions are used.
globalThis.fetch = async () => { throw new Error("Unexpected network request"); };
const require = createRequire(import.meta.url);
const testEnv = process.env as Record<string, string | undefined>;
testEnv.NODE_ENV = "production";
for (const key of ["DABOM_HOSTING", "DABOM_APPHOSTING_LB_IPS", "K_SERVICE"]) delete testEnv[key];
testEnv.NEXT_PUBLIC_APP_URL = "https://dabom.test";
const { createLoginRequestLimiter, loginClientAddress, LOGIN_REQUEST_LIMIT, LOGIN_REQUEST_WINDOW_MS } = require("../src/lib/security/login-rate-limit") as typeof import("../src/lib/security/login-rate-limit");
let passed = 0;
function check(name: string, condition: unknown) { assert.ok(condition, name); passed++; console.log(`PASS ${name}`); }
const request = (address?: string, suffix = "") => new Request(`https://dabom.test/api/auth/login${suffix}`, { headers: address ? { "x-forwarded-for": address } : {} });
const balancer = "35.219.200.50";
// App Hosting appends client, load balancer, then GFE.
const viaAppHosting = (client: string) => `${client}, ${balancer}, 35.191.0.1`;
function setAppHostingEnv(enabled: boolean) {
  if (enabled) Object.assign(testEnv, { DABOM_HOSTING: "firebase-app-hosting", DABOM_APPHOSTING_LB_IPS: balancer, K_SERVICE: "dabom" });
  else for (const key of ["DABOM_HOSTING", "DABOM_APPHOSTING_LB_IPS", "K_SERVICE"]) delete testEnv[key];
}

async function main() {
  check("direct/local forwarding headers cannot choose a new bucket", loginClientAddress(request("192.0.2.1"), "direct") === loginClientAddress(request("192.0.2.2"), "direct"));
  check("direct runtime ignores a well-formed App Hosting chain", loginClientAddress(request(viaAppHosting("192.0.2.1"))) === "untrusted-client");
  const chain = viaAppHosting("192.0.2.10");
  const firebaseAddress = (value?: string) => loginClientAddress(request(value), "firebase-app-hosting", balancer);
  check("App Hosting extracts client before the pinned balancer and GFE", firebaseAddress(chain) === "192.0.2.10");
  check("App Hosting ignores arbitrary forged XFF prefixes", ["198.51.100.1", "198.51.100.2, 198.51.100.3", "unknown", `192.0.2.99, ${balancer}, 35.191.0.2`].every(prefix => firebaseAddress(`${prefix}, ${chain}`) === "192.0.2.10"));
  check("App Hosting changing GFE does not change client quota", firebaseAddress(chain.replace("35.191.0.1", "35.191.0.2")) === firebaseAddress(chain));
  check("App Hosting verified addresses have separate buckets", firebaseAddress(viaAppHosting("192.0.2.1")) !== firebaseAddress(viaAppHosting("192.0.2.2")));
  check("App Hosting canonicalizes IPv6 clients", firebaseAddress(`2001:0db8:0000::1, ${balancer}, 35.191.0.1`) === firebaseAddress(`2001:db8::1, ${balancer}, 35.191.0.1`));
  for (const invalid of [undefined, "192.0.2.1", `192.0.2.1, ${balancer}`, "192.0.2.1, 198.51.100.1, 35.191.0.1", `unknown, ${balancer}, 35.191.0.1`, `192.0.2.1, ${balancer}, unknown`, `${"x".repeat(4096)}, ${chain}`]) {
    check("App Hosting malformed or unknown topology fails closed", firebaseAddress(invalid) === "untrusted-client");
  }
  check("App Hosting missing pinned balancers fails closed", loginClientAddress(request(chain), "firebase-app-hosting", "") === "untrusted-client");
  setAppHostingEnv(true);
  delete testEnv.K_SERVICE;
  check("App Hosting flag without Cloud Run context cannot trust headers", loginClientAddress(request(chain)) === "untrusted-client");
  testEnv.K_SERVICE = "dabom";
  check("App Hosting runtime selects verified proxy policy", loginClientAddress(request(chain)) === "192.0.2.10");
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
  const responses = await Promise.all(Array.from({ length: 75 }, (_, i) => GET(request(viaAppHosting("192.0.2.10"), `?next=/saju&attempt=${i}`))));
  check("route accepts first 30 attempts only", responses.filter(response => response.status === 307).length === 30 && responses.filter(response => response.status === 429).length === 45);
  check("45 rejected requests cause ZERO extra Firestore/OAuth/cookie calls", dbCalls === 30 && oauthCalls === 30 && cookieReads === 30);
  check("explicit interrupted flow return path is preserved", returnPaths.every(path => path === "/saju"));
  const rejected = responses.find(response => response.status === 429)!;
  check("blocked response is uncached and includes retry-after", rejected.headers.get("cache-control") === "private, no-store" && Number(rejected.headers.get("retry-after")) > 0 && !rejected.headers.has("set-cookie"));
  check("another IP can still begin login", (await GET(request(viaAppHosting("192.0.2.11")))).status === 307);
  check("login without next returns to the main page", returnPaths.at(-1) === "/");
  sharedAllowed = false;
  const beforeOAuth = oauthCalls;
  check("shared database limit is still enforced on a fresh process bucket", (await GET(request(viaAppHosting("192.0.2.12")))).status === 429 && oauthCalls === beforeOAuth);
  sharedAllowed = true;
  setAppHostingEnv(false);
  const beforeDb = dbCalls;
  for (let i = 1; i <= 35; i++) await GET(request(`198.51.100.${i}`));
  check("spoofed forwarding headers cannot bypass local protection", dbCalls - beforeDb === 30);
  testEnv.NODE_ENV = "development";
  testEnv.NEXT_PUBLIC_APP_URL = "http://10.0.0.184:3000";
  const counts = [dbCalls, oauthCalls, cookieReads];
  const local = await GET(new Request("http://localhost:3000/api/auth/login?next=%2Fsaju", { headers: { "x-forwarded-host": "evil.test" } }));
  check("development login moves to configured phone origin before OAuth", local.headers.get("location") === "http://10.0.0.184:3000/api/auth/login?next=%2Fsaju");
  check("host correction has no cookie, database or OAuth side effects", JSON.stringify(counts) === JSON.stringify([dbCalls, oauthCalls, cookieReads]) && !local.headers.has("set-cookie") && local.headers.get("cache-control") === "private, no-store");
  const unsafeNext = await GET(new Request("http://localhost:3000/api/auth/login?next=%2F%2Fevil.test"));
  check("canonical login sanitizes external return paths", new URL(unsafeNext.headers.get("location")!).searchParams.get("next") === "/");
  setAppHostingEnv(true);
  const normalizedRequest = new Request("http://0.0.0.0:3000/api/auth/login", { headers: { host: "10.0.0.184:3000", "x-forwarded-for": viaAppHosting("192.0.2.25") } });
  const phoneLogin = await GET(normalizedRequest);
  check("Next dev bind address normalization does not cause a redirect loop", phoneLogin.headers.get("location") === "https://kauth.kakao.com/oauth/authorize" && phoneLogin.headers.has("set-cookie"));
  console.log(`\n${passed} PASS; no Firestore writes, provider requests or customer data used.`);
}
main().catch(error => { console.error(error instanceof assert.AssertionError ? error.message : "Login rate-limit regression failed."); process.exitCode = 1; });
