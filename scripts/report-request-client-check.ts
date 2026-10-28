import assert from "node:assert/strict";
import { ReportLoginRequired, ReportRequestError, requestSajuReport } from "../src/lib/saju/report-request-client";

// Exercise comprehensive report preparation without
// a browser, customer records, payment requests, or an OpenAI request.
let passed = 0;
const check = (name: string, value: unknown) => { assert.ok(value, name); passed++; console.log(`PASS ${name}`); };
const originalFetch = globalThis.fetch;
const signal = new AbortController().signal;

async function main() {
  let requests = 0;
  globalThis.fetch = async (url, init) => {
    requests++;
    check("preparation calls only the saved profile's report endpoint", url === "/api/saju/profiles/profile-fixture/reports");
    check("comprehensive reports require no preference payload", init?.method === "POST" && init.body === undefined);
    return Response.json({ checkoutUrl: "https://untrusted.example/" }, { status: 402 });
  };
  const checkout = await requestSajuReport("profile-fixture", signal);
  check("paid-order recovery continues to the trusted checkout route", checkout.kind === "checkout" && checkout.href === "/saju/profiles/profile-fixture/checkout");
  check("one submission makes one report preparation request", requests === 1);

  globalThis.fetch = async () => Response.json({ reportId: "report-fixture", existing: false }, { status: 201 });
  const created = await requestSajuReport("profile-fixture", signal);
  check("prepared report opens its local detail route", created.kind === "report" && created.href === "/saju/reports/report-fixture");
  globalThis.fetch = async () => Response.json({ reportId: "report-fixture", existing: true });
  const existing = await requestSajuReport("profile-fixture", signal);
  check("a concurrently created report follows the duplicate flow", existing.kind === "existing" && existing.reportId === "report-fixture");

  globalThis.fetch = async () => new Response("", { status: 401 });
  await assert.rejects(requestSajuReport("profile-fixture", signal), ReportLoginRequired);
  check("expired login is handled even without JSON", true);
  globalThis.fetch = async () => Response.json({ error: "잠시 뒤 다시 확인해줘." }, { status: 409 });
  await assert.rejects(requestSajuReport("profile-fixture", signal), error => error instanceof ReportRequestError && error.message === "잠시 뒤 다시 확인해줘.");
  check("failed preparation preserves the server's recovery message", true);

  for (const response of [
    () => Response.json({ reportId: "//untrusted.example", existing: false }),
    () => Response.json({ reportId: "../checkout", existing: false }),
    () => Response.json({}),
    () => new Response("<html>unavailable</html>", { status: 502 }),
  ]) {
    globalThis.fetch = async () => response();
    await assert.rejects(requestSajuReport("profile-fixture", signal));
    check("malformed response cannot produce an unsafe or empty destination", true);
  }
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(requestSajuReport("profile-fixture", signal), ReportRequestError);
  check("network failure remains recoverable", true);

  const cancellation = new AbortController();
  globalThis.fetch = async (_url, init) => new Promise((_resolve, reject) => {
    init!.signal!.addEventListener("abort", () => reject(init!.signal!.reason), { once: true });
  });
  const inFlight = requestSajuReport("profile-fixture", cancellation.signal);
  cancellation.abort();
  await assert.rejects(inFlight, { name: "AbortError" });
  check("leaving the page cancels continuation", true);
  console.log(`\n${passed} PASS (synthetic responses; no external requests)`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { globalThis.fetch = originalFetch; });
