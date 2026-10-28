import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { birthDateEligibilityError, MINIMUM_AGE_MESSAGE } from "../src/lib/saju/age-policy";
import { profileInputSchema } from "../src/lib/saju/profile-input";

const require = createRequire(import.meta.url);
const testEnv = process.env as Record<string, string | undefined>;
testEnv.NODE_ENV = "development";
testEnv.NEXT_PUBLIC_APP_URL = "https://dabom.test";
globalThis.fetch = async () => { throw new Error("Unexpected network call"); };
let passed = 0;
function check(name: string, value: unknown) { assert.ok(value, name); passed++; console.log(`PASS ${name}`); }
const now = new Date("2026-10-28T00:00:00Z");
const birth = (birthDate: string, calendar: "solar" | "lunar" = "solar", isLeapMonth = false) => ({ birthDate, calendar, isLeapMonth });
const input = { name: "합성 검사", relationship: "SELF", gender: "female", ...birth("1995-05-20"), birthTime: "20:20" };
const adult = { id: "profile-fixture", userId: "fixture-owner", birthDate: new Date("1995-05-20T00:00:00Z"), isLunar: false, isLeapMonth: false };
const child = { ...adult, birthDate: new Date(`${new Date().getUTCFullYear() - 5}-01-01T00:00:00Z`) };

async function main() {
  check("birthday today is eligible", birthDateEligibilityError(birth("2012-10-28"), now) === null);
  check("birthday tomorrow is not eligible", birthDateEligibilityError(birth("2012-10-29"), now) === MINIMUM_AGE_MESSAGE);
  check("birthday yesterday is eligible", birthDateEligibilityError(birth("2012-10-27"), now) === null);
  check("Korean nominal age cannot bypass the limit", birthDateEligibilityError(birth("2013-01-01"), now) === MINIMUM_AGE_MESSAGE);
  check("future birth date is rejected", Boolean(birthDateEligibilityError(birth("2026-10-29"), now)));
  check("adult remains eligible", birthDateEligibilityError(birth("1995-05-20"), now) === null);
  check("KST midnight, not UTC midnight, starts the birthday", birthDateEligibilityError(birth("2012-10-28"), new Date("2026-10-27T15:00:00Z")) === null);
  check("one second before KST birthday is blocked", birthDateEligibilityError(birth("2012-10-28"), new Date("2026-10-27T14:59:59Z")) === MINIMUM_AGE_MESSAGE);
  check("leap-day birthday has not occurred on February 28", birthDateEligibilityError(birth("2012-02-29"), new Date("2026-02-28T12:00:00Z")) === MINIMUM_AGE_MESSAGE);
  check("leap-day birthday is reached on March 1 in a common year", birthDateEligibilityError(birth("2012-02-29"), new Date("2026-03-01T00:00:00Z")) === null);
  check("lunar date converts to the solar birthday boundary", birthDateEligibilityError(birth("2012-09-14", "lunar"), now) === null);
  check("lunar month text cannot bypass a later solar birthday", birthDateEligibilityError(birth("2012-09-15", "lunar"), now) === MINIMUM_AGE_MESSAGE);
  check("regular lunar fourth month is already eligible in May", birthDateEligibilityError(birth("2012-04-01", "lunar"), new Date("2026-05-01T00:00:00Z")) === null);
  check("leap lunar fourth month has a different birthday", birthDateEligibilityError(birth("2012-04-01", "lunar", true), new Date("2026-05-01T00:00:00Z")) === MINIMUM_AGE_MESSAGE);
  for (const value of [birth("2012-02-30"), birth("2012-13-01"), birth("2012-09-31", "lunar"), birth("2012-09-14", "lunar", true), birth("NaN")]) check("invalid date/leap month is rejected", Boolean(birthDateEligibilityError(value, now)));
  check("invalid clock fails closed", Boolean(birthDateEligibilityError(birth("1995-05-20"), new Date(NaN))));
  for (const relationship of ["SELF", "FAMILY", "FRIEND", "PARTNER", "OTHER"]) check(`age applies to ${relationship}`, !profileInputSchema.safeParse({ ...input, relationship, birthDate: child.birthDate.toISOString().slice(0, 10), age: 18, today: "2099-01-01" }).success);
  check("normal adult schema is unchanged", profileInputSchema.safeParse(input).success);
  const { restoreProfileDraft } = require("../src/lib/profile-draft");
  check("a saved underage draft cannot be restored", restoreProfileDraft(JSON.stringify({ accountId: "fixture-owner", input: { ...input, birthDate: child.birthDate.toISOString().slice(0, 10) } }), "fixture-owner") === null);

  const { FirebaseStore, firebaseStore: store } = require("../src/lib/firebase/store") as typeof import("../src/lib/firebase/store");
  const { storedProfileAgeError } = require("../src/lib/saju/profile-age");
  check("malformed legacy birthday fails closed", Boolean(storedProfileAgeError({ ...adult, birthDate: new Date(NaN) })));
  const isolated = new FirebaseStore(() => { throw new Error("Unexpected database access"); });
  isolated.transaction = (async (action: (tx: unknown) => unknown) => action({})) as never;
  isolated.requireActiveAccount = (async () => ({ id: "fixture-owner", createdAt: new Date() })) as never;
  isolated.read = (async (collection: string) => collection === "profiles" ? child : collection === "reports" ? { id: "report-fixture", userId: "fixture-owner", sajuProfileId: child.id, status: "PENDING" } : null) as never;
  for (const [name, operation] of [
    ["raw profile storage", () => isolated.saveProfile(child as never, "legacy")],
    ["new report from a legacy profile", () => isolated.ensureReport("fixture-owner", child.id, { productCode: "yearly_2026", promptVersion: "fixture", model: "fixture" }, undefined, true)],
    ["new payment from a legacy profile", () => isolated.prepareOrder("fixture-owner", child.id, { productCode: "yearly_2026", promptVersion: "fixture", model: "fixture" })],
    ["generation claim for a legacy profile", () => isolated.claimReport("report-fixture", {}, "fixture-owner", true)],
  ] as const) {
    await assert.rejects(operation, (error: unknown) => error instanceof Error && error.message === MINIMUM_AGE_MESSAGE);
    check(`${name} is blocked before writes`, true);
  }

  const authPath = require.resolve("../src/lib/firebase/auth"); require(authPath);
  require.cache[authPath]!.exports = { ...require(authPath), getFirebaseAccount: async () => ({ id: "fixture-owner" }) };
  const ratePath = require.resolve("../src/lib/security/rate-limit"); require(ratePath);
  require.cache[ratePath]!.exports = { enforceAccountRateLimit: async () => {} };
  let writes = 0;
  const servicePath = require.resolve("../src/lib/saju/library-service"); require(servicePath);
  require.cache[servicePath]!.exports = { ...require(servicePath), findExistingSajuReport: async () => null, saveSajuProfile: async () => { writes++; return { profileId: adult.id, existing: false }; } };
  const { POST } = require("../src/app/api/saju/profiles/route");
  const request = (value: unknown) => new Request("https://dabom.test/api/saju/profiles", { method: "POST", headers: { origin: "https://dabom.test", "content-type": "application/json" }, body: JSON.stringify(value) });
  const rejected = await POST(request({ ...input, birthDate: child.birthDate.toISOString().slice(0, 10), age: 30 }));
  check("direct profile API returns clear 400", rejected.status === 400 && (await rejected.json()).error === MINIMUM_AGE_MESSAGE && writes === 0);
  check("profile refusal is no-store", rejected.headers.get("cache-control") === "private, no-store");
  check("adult profile API still succeeds", (await POST(request(input))).status === 201 && writes === 1);
  store.getProfile = (async () => child) as never;
  store.getReportWithAccess = (async () => null) as never;
  const { POST: createReport } = require("../src/app/api/saju/profiles/[profileId]/reports/route");
  check("old profile ID cannot create a report", (await createReport(request({}), { params: Promise.resolve({ profileId: child.id }) })).status === 400);
  store.getReportWithAccess = (async () => ({ id: "report-fixture", userId: "fixture-owner", status: "PENDING", sajuProfile: child, order: null })) as never;
  const { generateReport } = require("../src/lib/llm/report-generator");
  await assert.rejects(() => generateReport("report-fixture"), (error: unknown) => error instanceof Error && error.message === MINIMUM_AGE_MESSAGE);
  check("non-HTTP generation is rejected before provider calls", true);
  const { POST: generate } = require("../src/app/api/saju/reports/[reportId]/generate/route");
  check("legacy generation API returns the age message", (await generate(request({}), { params: Promise.resolve({ reportId: "report-fixture" }) })).status === 400);
  console.log(`Profile age: ${passed} PASS. Synthetic data only; no database, payment, or LLM calls.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
