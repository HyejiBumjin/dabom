import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import type { Prisma } from "@prisma/client";
import { createPrismaClient } from "../prisma/client.cjs";
import { saveSajuProfile, prepareSajuOrder, fulfillSajuOrder, PAYMENT_TRANSACTION_OPTIONS } from "../src/lib/saju/library-service";
import { profileInputSchema } from "../src/lib/saju/profile-input";
import { enforceAccountRateLimit } from "../src/lib/security/rate-limit";

loadEnvConfig(process.cwd());
let passed = 0;
function check(name: string, ok: unknown) { assert.ok(ok, name); passed++; console.log(`PASS ${name}`); }
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Database not configured");
  const url = new URL(process.env.DATABASE_URL);
  if (url.hostname.endsWith(".pooler.supabase.com")) { url.port = "5432"; url.searchParams.delete("pgbouncer"); }
  const admin = createPrismaClient({ datasourceUrl: url.toString() });
  // Only disposable synthetic fixtures are committed, inside a random isolated
  // schema that isn't exposed through the Data API. No public customer row changes.
  const schema = `security_test_${randomUUID().replaceAll("-", "")}`;
  assert.match(schema, /^security_test_[a-f0-9]{32}$/);
  const isolatedUrl = new URL(url); isolatedUrl.searchParams.set("schema", schema); isolatedUrl.searchParams.set("connection_limit", "2");
  const a = createPrismaClient({ datasourceUrl: isolatedUrl.toString() });
  const b = createPrismaClient({ datasourceUrl: isolatedUrl.toString() });
  let created = false;
  try {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`); created = true;
    await admin.$executeRawUnsafe(`REVOKE ALL ON SCHEMA "${schema}" FROM PUBLIC, anon, authenticated`);
    for (const table of ["User", "SajuProfile", "Product", "Order", "Report"]) await admin.$executeRawUnsafe(`CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
    const enums = [
      { type: "Gender", values: "'MALE','FEMALE'", table: "SajuProfile", column: "gender" },
      { type: "ProfileRelationship", values: "'SELF','FAMILY','FRIEND','PARTNER','OTHER'", table: "SajuProfile", column: "relationship", initial: "SELF" },
      { type: "OrderStatus", values: "'READY','PAID','FAILED','CANCELLED'", table: "Order", column: "status", initial: "READY" },
      { type: "ReportStatus", values: "'PENDING','GENERATING','COMPLETED','FAILED'", table: "Report", column: "status", initial: "PENDING" },
    ];
    for (const item of enums) {
      await admin.$executeRawUnsafe(`CREATE TYPE "${schema}"."${item.type}" AS ENUM (${item.values})`);
      await admin.$executeRawUnsafe(`ALTER TABLE "${schema}"."${item.table}" ALTER COLUMN "${item.column}" DROP DEFAULT`);
      await admin.$executeRawUnsafe(`ALTER TABLE "${schema}"."${item.table}" ALTER COLUMN "${item.column}" TYPE "${schema}"."${item.type}" USING "${item.column}"::text::"${schema}"."${item.type}"`);
      if (item.initial) await admin.$executeRawUnsafe(`ALTER TABLE "${schema}"."${item.table}" ALTER COLUMN "${item.column}" SET DEFAULT '${item.initial}'::"${schema}"."${item.type}"`);
    }
    await admin.$executeRawUnsafe(`CREATE TABLE "${schema}"."SecurityRateLimit" ("key" TEXT PRIMARY KEY, "hits" INTEGER NOT NULL DEFAULT 0, "resetAt" TIMESTAMP(3) NOT NULL)`);
    const owner = await a.user.create({ data: { kakaoId: randomUUID(), nickname: "synthetic-security-owner" } });
    await a.product.create({ data: { code: "yearly_2026", name: "synthetic-product", price: 3900 } });
    const input = profileInputSchema.parse({ name: "가상 검사", gender: "female", birthDate: "1995-05-20", birthTime: "20:20", calendar: "solar", isLeapMonth: false });
    const profiles = await Promise.all(Array.from({ length: 6 }, (_, index) => saveSajuProfile(owner.id, input, index % 2 ? a : b)));
    check("six concurrent profile saves create one profile", new Set(profiles.map(profile => profile.profileId)).size === 1 && await a.sajuProfile.count() === 1);
    const profileId = profiles[0].profileId;
    const orders = await Promise.all(Array.from({ length: 6 }, (_, index) => prepareSajuOrder(owner.id, profileId, index % 2 ? a : b)));
    assert.ok(orders.every(order => !order.existing));
    const orderId = orders[0].existing ? "" : orders[0].orderId;
    check("six concurrent checkouts create one stable payment ID", orders.every(order => !order.existing && order.orderId === orderId) && await a.order.count() === 1);
    const payment = { id: orderId, amount: 3900, currency: "KRW", status: "PAID" };
    const reports = await Promise.all(Array.from({ length: 6 }, (_, index) => (index % 2 ? a : b).$transaction(tx => fulfillSajuOrder(owner.id, orderId, payment, tx), PAYMENT_TRANSACTION_OPTIONS)));
    check("six concurrent confirmations return one report", new Set(reports.map(report => report.id)).size === 1 && await a.report.count() === 1);
    const reportId = reports[0].id;
    const claims = await Promise.all(Array.from({ length: 8 }, (_, index) => (index % 2 ? a : b).report.updateMany({ where: { id: reportId, status: { in: ["PENDING", "FAILED"] } }, data: { status: "GENERATING" } })));
    check("eight simultaneous generation claims have one winner", claims.reduce((sum, claim) => sum + claim.count, 0) === 1);
    const limits = await Promise.allSettled(Array.from({ length: 10 }, (_, index) => enforceAccountRateLimit(owner.id, "concurrency", 3, 3600000, index % 2 ? a : b)));
    check("shared rate limit admits exactly three of ten concurrent requests", limits.filter(result => result.status === "fulfilled").length === 3 && limits.filter(result => result.status === "rejected").every(result => result.reason.status === 429));
    await a.order.update({ where: { merchantUid: orderId }, data: { status: "READY" } });
    let signalRead!: () => void; const read = new Promise<void>(resolve => { signalRead = resolve; });
    let signalCancelled!: () => void; const cancelled = new Promise<void>(resolve => { signalCancelled = resolve; });
    const confirming = a.$transaction(async tx => {
      const intercepted = {
        order: {
          findFirst: async (args: Parameters<typeof tx.order.findFirst>[0]) => { const result = await tx.order.findFirst(args); signalRead(); await cancelled; return result; },
          updateMany: tx.order.updateMany.bind(tx.order),
        }, report: tx.report,
      } as unknown as Prisma.TransactionClient;
      return fulfillSajuOrder(owner.id, orderId, payment, intercepted);
    }, PAYMENT_TRANSACTION_OPTIONS);
    // Register the rejection before allowing the second connection to cancel.
    const rejection = assert.rejects(confirming, /ORDER_CANCELLED/);
    await read;
    try { await b.order.update({ where: { merchantUid: orderId }, data: { status: "CANCELLED" } }); }
    finally { signalCancelled(); }
    await rejection;
    check("real DB cancellation between read and write stays CANCELLED", (await b.order.findUniqueOrThrow({ where: { merchantUid: orderId } })).status === "CANCELLED");
  } finally {
    await Promise.all([a.$disconnect(), b.$disconnect()]);
    if (created) await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    const leftovers = await admin.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) FROM pg_namespace WHERE nspname=${schema}`;
    check("isolated schema and all synthetic fixtures removed", leftovers[0].count === BigInt(0));
    await admin.$disconnect();
  }
  console.log(`\n${passed} PASS with two independent DB clients; no customer rows, real charges, or LLM calls`);
}
main().catch(error => {
  let detail = String(error?.message ?? "Unknown test failure").replace(/(?:postgres(?:ql)?|https?):\/\/\S+/g, "[redacted URL]");
  for (const name of ["DATABASE_URL", "SUPABASE_DIRECT_URL", "SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY", "PORTONE_API_SECRET"]) if (process.env[name]) detail = detail.split(process.env[name]!).join("[redacted]");
  console.error("Concurrency security check failed", { code: error?.code, detail }); process.exitCode = 1;
});
