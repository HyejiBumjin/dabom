import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { PROFILE_NOTICE_VERSION, profileNoticeText, profileUseError, SELF_ONLY_MESSAGE, PROFILE_NOTICE_MESSAGE } from "../src/lib/privacy/profile-use";
import { sameProfileIdentity } from "../src/lib/saju/profile-identity";
import { restoreProfileDraft } from "../src/lib/profile-draft";

const require = createRequire(import.meta.url);
Object.assign(process.env, { NODE_ENV: "development", NEXT_PUBLIC_APP_URL: "https://dabom.test" });
globalThis.fetch = async () => { throw new Error("Network forbidden"); };
const notice = { version: PROFILE_NOTICE_VERSION, self: true } as const;
const privacyNotice = { ...notice, acceptedAt: new Date().toISOString(), text: profileNoticeText };
const input = { name: "합성", relationship: "SELF", gender: "female", birthDate: "1995-05-20", birthTime: "20:20", calendar: "solar", isLeapMonth: false, notice };
const profile = { id: "p", userId: "owner", name: input.name, relationship: "SELF", birthDate: new Date(input.birthDate), isLunar: false, isLeapMonth: false, privacyNotice };
let passed = 0;
const check = (name: string, ok: unknown) => { assert.ok(ok, name); passed++; console.log(`PASS ${name}`); };
async function main() {
  check("self with current notice allowed", profileUseError(profile) === null);
  for (const relationship of ["FAMILY", "FRIEND", "PARTNER", "OTHER", undefined]) check("non-self/unknown subject blocked", profileUseError({ ...profile, relationship }) === SELF_ONLY_MESSAGE);
  check("legacy missing notice requires confirmation", profileUseError({ ...profile, privacyNotice: undefined }) === PROFILE_NOTICE_MESSAGE);
  check("stale notice requires confirmation", Boolean(profileUseError({ ...profile, privacyNotice: { ...privacyNotice, version: "old" as typeof PROFILE_NOTICE_VERSION } })));
  check("name whitespace normalization deduplicates", sameProfileIdentity(profile, { ...profile, name: " 합 성 " }));
  check("different names do not falsely claim identity", !sameProfileIdentity(profile, { ...profile, name: "다른사람" }));
  check("lunar and solar birthday variants deduplicate", sameProfileIdentity({ ...profile, birthDate: new Date("2012-09-14"), isLunar: true }, { ...profile, birthDate: new Date("2012-10-28") }));
  check("legacy family draft is not restored as self", restoreProfileDraft(JSON.stringify({ accountId: "owner", input: { ...input, relationship: "FAMILY" } }), "owner") === null);
  const authPath = require.resolve("../src/lib/firebase/auth"); require(authPath);
  require.cache[authPath]!.exports = { ...require(authPath), getFirebaseAccount: async () => ({ id: "owner" }) };
  const ratePath = require.resolve("../src/lib/security/rate-limit"); require(ratePath);
  require.cache[ratePath]!.exports = { enforceAccountRateLimit: async () => {} };
  const servicePath = require.resolve("../src/lib/saju/library-service"); require(servicePath);
  let writes = 0;
  require.cache[servicePath]!.exports = { ...require(servicePath), findExistingSajuReport: async () => null, saveSajuProfile: async () => { writes++; return { profileId: "p", existing: false }; } };
  const { POST } = require("../src/app/api/saju/profiles/route");
  const request = (data: unknown) => new Request("https://dabom.test/api/saju/profiles", { method: "POST", headers: { origin: "https://dabom.test", "content-type": "application/json" }, body: JSON.stringify(data) });
  for (const data of [{ ...input, notice: undefined }, { ...input, notice: { ...notice, self: false } }, { ...input, notice: { ...notice, version: "old" } }, { ...input, relationship: "FAMILY" }]) check("API rejects bypass before saving", (await POST(request(data))).status === 400 && writes === 0);
  check("valid explicit confirmation succeeds", (await POST(request(input))).status === 201 && writes === 1);
  const { FirebaseStore } = require("../src/lib/firebase/store");
  const store = new FirebaseStore(() => { throw new Error("Database forbidden"); });
  store.transaction = (action: (tx: object) => unknown) => action({});
  store.requireActiveAccount = async () => ({ id: "owner" });
  const metadata = { productCode: "yearly_2026", model: "test", promptVersion: "test" };
  for (const denied of [{ ...profile, relationship: "FAMILY" }, { ...profile, privacyNotice: undefined }]) {
    store.read = async (collection: string) => collection === "profiles" ? denied : collection === "reports" ? { id: "r", userId: "owner", status: "PENDING", sajuProfileId: "p" } : null;
    for (const operation of [() => store.saveProfile(denied, "legacy"), () => store.ensureReport("owner", "p", metadata, undefined, true), () => store.prepareOrder("owner", "p", metadata), () => store.claimReport("r", {}, "owner", true)]) {
      await assert.rejects(operation, (e: unknown) => e instanceof Error && [SELF_ONLY_MESSAGE, PROFILE_NOTICE_MESSAGE].includes(e.message));
      check("direct store cannot bypass subject policy", true);
    }
  }
  console.log(`Profile use: ${passed} PASS, no network or customer data.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
