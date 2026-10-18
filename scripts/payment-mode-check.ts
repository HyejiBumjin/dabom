import assert from "node:assert/strict";
import { isPaymentTestMode, paymentCollectionPrefix, allowsDevelopmentReports } from "../src/lib/portone/payment-mode";
import { FirebaseStore, stableId } from "../src/lib/firebase/store";
import { parsePortOnePayment } from "../src/lib/portone/server";

const env = process.env as Record<string, string | undefined>;
const keys = ["NODE_ENV", "DABOM_PAYMENT_TEST_MODE", "DABOM_HOSTING", "VERCEL", "NEXT_PUBLIC_APP_URL"];
const before = Object.fromEntries(keys.map(key => [key, env[key]]));
let passed = 0;
const check = (name: string, value: unknown) => { assert.ok(value, name); passed++; console.log(`PASS ${name}`); };
try {
  for (const key of keys) delete env[key];
  env.NODE_ENV = "development";
  env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  check("ordinary local preview still works", allowsDevelopmentReports() && !isPaymentTestMode() && paymentCollectionPrefix() === "");
  const payment = { id: "payment", storeId: "store", channel: { key: "channel", type: "TEST" }, amount: { total: 3900 }, currency: "KRW", status: "PAID" };
  assert.throws(() => parsePortOnePayment(payment, "payment", "store", "channel"));
  check("test payment cannot enter ordinary production collections via local server", true);
  env.DABOM_PAYMENT_TEST_MODE = "true";
  check("payment rehearsal requires payment instead of free generation", isPaymentTestMode() && !allowsDevelopmentReports());
  check("test namespace is separate", paymentCollectionPrefix() === "payment_test_");
  const calls: string[] = [];
  const database = (() => ({ collection(name: string) { calls.push(name); return name; } })) as unknown as ConstructorParameters<typeof FirebaseStore>[0];
  const test = new FirebaseStore(database, paymentCollectionPrefix);
  const live = new FirebaseStore(database);
  for (const collection of ["users", "profiles", "products", "orders", "reports", "sessions", "oauthAttempts", "rateLimits"]) test.collection(collection);
  check("all rehearsal storage is isolated, including login and rate limits", calls.every(name => name.startsWith("payment_test_")) && calls.length === 8);
  const liveId = live.orderId("user", "profile", "yearly_2026");
  check("payment ID respects KCP's 40-character limit", liveId.length === 40 && test.orderId("user", "profile", "yearly_2026").length === 40);
  check("live order ID is deterministic for the same purchase", liveId === `saju_${stableId("user", "profile", "yearly_2026").slice(0, 35)}`);
  check("provider payment ID cannot collide with live orders", liveId !== test.orderId("user", "profile", "yearly_2026"));
  check("retries use the same isolated payment ID", test.orderId("user", "profile", "yearly_2026") === test.orderId("user", "profile", "yearly_2026"));
  check("TEST payment accepted only in explicit test mode", parsePortOnePayment(payment, "payment", "store", "channel").status === "PAID");
  assert.throws(() => parsePortOnePayment({ ...payment, channel: { key: "channel", type: "LIVE" } }, "payment", "store", "channel"));
  check("live payment rejected in rehearsal", true);
  for (const [key, value] of [["NODE_ENV", "production"], ["DABOM_HOSTING", "firebase-app-hosting"], ["VERCEL", "1"], ["NEXT_PUBLIC_APP_URL", "https://dabom-letter.com"], ["NEXT_PUBLIC_APP_URL", "https://localhost.evil.test"], ["DABOM_PAYMENT_TEST_MODE", "yes"]]) {
    const old = env[key]; env[key] = value;
    assert.throws(isPaymentTestMode);
    assert.throws(() => test.collection("orders"));
    check(`unsafe test configuration blocks storage (${key})`, true);
    if (old === undefined) delete env[key]; else env[key] = old;
  }
  env.NODE_ENV = "production"; env.DABOM_PAYMENT_TEST_MODE = "false";
  check("production remains paid and uses live collections", !isPaymentTestMode() && !allowsDevelopmentReports() && paymentCollectionPrefix() === "");
  console.log(`\n${passed} PASS (configuration and in-memory storage only)`);
} finally { for (const key of keys) { if (before[key] === undefined) delete env[key]; else env[key] = before[key]; } }
