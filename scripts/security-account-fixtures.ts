import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { createPrismaClient } from "../prisma/client.cjs";
import { SAJU_PRODUCT_CODE } from "../src/lib/saju/profile-input";

// Only profiles created through the real test account's browser form qualify.
// No Auth tokens, customer reports, provider calls, or LLM calls are used here.
type FixtureProfile = {
  label: string; profileId: string; name: string; relationship: string;
  birthDate: string; birthTime: string | null;
  reportId?: string; orderId?: string; merchantUid?: string;
};
type Manifest = { run: string; profiles: FixtureProfile[]; phase: "profiles" | "reports" | "cleaned"; temporaryAccount?: { authUserId: string; cleaned?: boolean } };

async function main() {
loadEnvConfig(process.cwd());
const [command, file] = process.argv.slice(2);
assert.ok(["attach", "cleanup", "verify"].includes(command) && file, "Usage: security-account-fixtures.ts attach|cleanup|verify MANIFEST");
const manifest = JSON.parse(await readFile(file, "utf8")) as Manifest;
assert.match(manifest.run, /^1013-[a-f0-9]{6}$/);
assert.ok(manifest.profiles.length >= 1 && manifest.profiles.length <= 10);
assert.equal(new Set(manifest.profiles.map(p => p.profileId)).size, manifest.profiles.length);
for (const profile of manifest.profiles) {
  assert.ok(profile.name.startsWith(`보안검사-${manifest.run}-`));
  assert.match(profile.profileId, /^[a-z0-9]{20,40}$/);
  assert.match(profile.birthDate, /^190[1-3]-\d{2}-\d{2}$/);
}
const db = createPrismaClient();

async function run() {
  if (command === "verify") {
    const remaining = await db.sajuProfile.count({ where: { id: { in: manifest.profiles.map(p => p.profileId) } } });
    assert.equal(remaining, 0, "Synthetic profiles must be removed after testing");
    if (manifest.temporaryAccount) {
      assert.equal(manifest.temporaryAccount.cleaned, true);
      const rows = await db.$queryRaw<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM auth.users WHERE email LIKE ${`security-${manifest.run}-%@example.invalid`}`;
      assert.equal(rows[0].count, 0, "All temporary Auth identities for this run must be removed");
      assert.equal(await db.user.count({ where: { nickname: `보안검사-${manifest.run}-B` } }), 0);
      console.log("PASS all temporary B Auth/app identities for this run removed");
    }
    console.log("PASS test profiles cleaned; real accounts preserved");
    return;
  }
  await db.$transaction(async tx => {
    for (const fixture of manifest.profiles) {
      const profile = await tx.sajuProfile.findUniqueOrThrow({
        where: { id: fixture.profileId },
        select: { name: true, userId: true, relationship: true, birthDate: true, birthTime: true, orders: { select: { id: true, merchantUid: true } }, reports: { select: { id: true, model: true, content: true } } },
      });
      assert.ok(profile.userId, "A real authenticated account must own the synthetic profile");
      assert.equal(profile.name, fixture.name, "Never modify a customer profile");
      assert.equal(profile.relationship, fixture.relationship);
      assert.equal(profile.birthDate.toISOString().slice(0, 10), fixture.birthDate);
      assert.equal(profile.birthTime, fixture.birthTime);
      if (command === "attach") {
        assert.equal(profile.orders.length, 0, "Never replace an existing purchase");
        assert.equal(profile.reports.length, 0, "Never replace an existing report");
        const product = await tx.product.findUniqueOrThrow({ where: { code: SAJU_PRODUCT_CODE }, select: { id: true, price: true } });
        assert.ok(product.price > 0);
        fixture.merchantUid = `security-account-${manifest.run}-${randomUUID()}`;
        const order = await tx.order.create({ data: {
          userId: profile.userId, sajuProfileId: fixture.profileId, productId: product.id,
          merchantUid: fixture.merchantUid, status: "PAID", amount: product.price,
          // Deliberate synthetic entitlement; no money or provider transaction.
          paidAmount: null, paidAt: null, pgTxId: null,
        }, select: { id: true } });
        const message = `${fixture.name} 전용 보안 검사 메시지야. 가상 데이터로 접근 권한만 확인하고 있어.`;
        const report = await tx.report.create({ data: {
          sajuProfileId: fixture.profileId, orderId: order.id, productCode: SAJU_PRODUCT_CODE,
          status: "COMPLETED", model: "security-fixture-no-provider", promptVersion: "security-account-fixture",
          completedAt: new Date(), content: { paragraphs: [message], meta: { presentation: "letter", charCount: message.length, beats: [], termsUsed: [] } },
        }, select: { id: true } });
        fixture.orderId = order.id; fixture.reportId = report.id;
      } else {
        // A changed fixture is a blocker, never a reason for broad deletion.
        for (const order of profile.orders) assert.ok(order.merchantUid.startsWith(`security-account-${manifest.run}-`));
        for (const report of profile.reports) assert.equal(report.model, "security-fixture-no-provider");
        await tx.report.deleteMany({ where: { sajuProfileId: fixture.profileId, model: "security-fixture-no-provider" } });
        await tx.order.deleteMany({ where: { sajuProfileId: fixture.profileId, merchantUid: { startsWith: `security-account-${manifest.run}-` } } });
        await tx.sajuProfile.delete({ where: { id: fixture.profileId } });
      }
    }
  }, { timeout: 30_000 });
  manifest.phase = command === "attach" ? "reports" : "cleaned";
  await writeFile(file, JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600 });
  console.log(`PASS ${command}: ${manifest.profiles.length} synthetic profiles; no provider/LLM calls`);
}

try { await run(); }
catch { console.error("Account fixture operation failed safely. Inspect the local fixture manifest; no raw database error or credentials are logged."); process.exitCode = 1; }
finally { await db.$disconnect(); }
}

main().catch(() => { console.error("Invalid test fixture manifest; no database changes requested."); process.exitCode = 1; });
