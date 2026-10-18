import assert from "node:assert/strict";
import { CheckoutLoginRequired, confirmedCheckoutSchema, postCheckout, preparedCheckoutSchema } from "../src/lib/portone/checkout-client";

// Synthetic HTTP responses only; never opens a PG window or calls a payment API.
let passed = 0;
const check = (name: string, value: unknown) => { assert.ok(value, name); passed++; console.log(`PASS ${name}`); };
const signal = new AbortController().signal;
const originalFetch = globalThis.fetch;

async function main() {
  const order = { existing: false, orderId: "saju_fixture", amount: 3900, orderName: "2026년 올해 운세" };
  globalThis.fetch = async (url, init) => {
    check("only same-origin preparation endpoint is used", url === "/api/saju/payments/prepare");
    check("request sends profile only, not client price or paid state", init?.body === JSON.stringify({ profileId: "profile-fixture" }));
    return Response.json(order);
  };
  check("valid order accepted", (await postCheckout("prepare", { profileId: "profile-fixture" }, preparedCheckoutSchema, signal)).existing === false);
  check("duplicate purchase opens the saved report", preparedCheckoutSchema.safeParse({ existing: true, reportId: "report-fixture" }).success);
  for (const patch of [{ amount: -1 }, { amount: 0.5 }, { orderId: "../../login" }, { orderId: "https://evil.test" }, { existing: "false" }]) {
    check("invalid checkout payload rejected", !preparedCheckoutSchema.safeParse({ ...order, ...patch }).success);
  }
  check("report redirect must be an identifier", !confirmedCheckoutSchema.safeParse({ reportId: "//evil.test" }).success);
  globalThis.fetch = async () => new Response("", { status: 401 });
  await assert.rejects(postCheckout("confirm", { orderId: "saju_fixture", paymentId: "saju_fixture" }, confirmedCheckoutSchema, signal), CheckoutLoginRequired);
  check("expired session reaches login even without a JSON body", true);
  globalThis.fetch = async () => new Response("<html>upstream unavailable</html>", { status: 502 });
  await assert.rejects(postCheckout("confirm", {}, confirmedCheckoutSchema, signal), /결제 서버에 연결하지 못했어/u);
  check("gateway HTML produces a recoverable message", true);
  globalThis.fetch = async () => Response.json({ error: "잠시 뒤 다시 확인해줘." }, { status: 409 });
  await assert.rejects(postCheckout("confirm", {}, confirmedCheckoutSchema, signal), /잠시 뒤 다시 확인해줘/u);
  check("pending payment offers the server retry message", true);
  globalThis.fetch = async () => Response.json({ reportId: "report-fixture" });
  check("confirmed report accepted", (await postCheckout("confirm", {}, confirmedCheckoutSchema, signal)).reportId === "report-fixture");

  // Keep Node alive while AbortSignal.timeout's unref'ed timer fires.
  const keepAlive = setInterval(() => {}, 1000);
  try {
    globalThis.fetch = async (_url, init) => new Promise((_resolve, reject) => {
      init!.signal!.addEventListener("abort", () => reject(init!.signal!.reason), { once: true });
    });
    await assert.rejects(postCheckout("prepare", {}, preparedCheckoutSchema, signal, 15), /연결이 오래 걸리고 있어/u);
    check("stalled request stops at its deadline", true);
    globalThis.fetch = async (_url, init) => new Response(new ReadableStream({
      start(controller) { init!.signal!.addEventListener("abort", () => controller.error(init!.signal!.reason), { once: true }); },
    }));
    await assert.rejects(postCheckout("confirm", {}, confirmedCheckoutSchema, signal, 15), /연결이 오래 걸리고 있어/u);
    check("stalled response body also stops at its deadline", true);
    const cancellation = new AbortController();
    const request = postCheckout("confirm", {}, confirmedCheckoutSchema, cancellation.signal);
    cancellation.abort();
    await assert.rejects(request, { name: "AbortError" });
    check("leaving the screen aborts the confirmation request", true);
  } finally { clearInterval(keepAlive); }
  console.log(`\n${passed} PASS (synthetic responses; no payment or customer data used)`);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { globalThis.fetch = originalFetch; });
