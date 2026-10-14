import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { createPrismaClient } from "../prisma/client.cjs";

loadEnvConfig(process.cwd());
let passed = 0;
function check(name: string, ok: unknown) { assert.ok(ok, name); passed++; console.log(`PASS ${name}`); }

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");
  const url = new URL(process.env.DATABASE_URL);
  if (url.hostname.endsWith(".pooler.supabase.com")) { url.port = "5432"; url.searchParams.delete("pgbouncer"); }
  const db = createPrismaClient({ datasourceUrl: url.toString() });
  const userId = randomUUID();
  const fixture = `security-check-${randomUUID()}`;
  const rollback = new Error("ROLLBACK_SECURITY_CHECK");
  let hardened = false;
  try {
    await db.$transaction(async tx => {
      // All fixtures, role changes, DDL, grants and policy changes are rolled back.
      // Queries touch only synthetic rows; no real user/report/cache data is read.
      await tx.$executeRaw`INSERT INTO auth.users (id, email) VALUES (${userId}::uuid, ${`${fixture}@example.invalid`})`;
      const orders = await tx.$queryRaw<Array<{ id: string }>>`INSERT INTO public.orders (owner_id, product_code, order_id, amount) VALUES (${userId}::uuid, 'FORTUNE_2026', ${fixture}, 3900) RETURNING id::text`;
      const cache = await tx.$queryRaw<Array<{ id: string }>>`INSERT INTO public.saju_calculations (input_hash, normalized_input, provider, provider_version, canonical_json, provider_raw) VALUES (${fixture}, '{"synthetic":true}', 'security-test', 'test', '{}', '{}') RETURNING id::text`;
      await tx.$executeRaw`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: "authenticated" })}, true)`;
      const state = await tx.$queryRaw<Array<{ applied: boolean }>>`SELECT EXISTS (SELECT 1 FROM public._prisma_migrations WHERE migration_name='20261012000000_security_hardening' AND finished_at IS NOT NULL AND rolled_back_at IS NULL) AS applied`;
      hardened = state[0].applied;
      async function deniedForRole(role: "anon" | "authenticated", run: () => Promise<unknown>) {
        await tx.$executeRawUnsafe("SAVEPOINT denied_request");
        await tx.$executeRawUnsafe(`SET LOCAL ROLE ${role}`);
        let denied = false;
        try { await run(); }
        catch (error) { denied = /42501|permission denied/.test(String(error)); }
        await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT denied_request");
        await tx.$executeRawUnsafe("RELEASE SAVEPOINT denied_request");
        return denied;
      }
      if (hardened) {
        check("LIVE: synthetic owner cannot forge legacy paid status", await deniedForRole("authenticated", () => tx.$queryRaw`UPDATE public.orders SET status='paid' WHERE id=${orders[0].id}::uuid RETURNING status`));
        check("LIVE: anonymous role cannot read synthetic birth cache", await deniedForRole("anon", () => tx.$queryRaw`SELECT normalized_input FROM public.saju_calculations WHERE id=${cache[0].id}::uuid`));
      } else {
        await tx.$executeRaw`SET LOCAL ROLE authenticated`;
        const forged = await tx.$queryRaw<Array<{ status: string }>>`UPDATE public.orders SET status = 'paid' WHERE id = ${orders[0].id}::uuid RETURNING status`;
        check("BEFORE: synthetic owner can forge legacy paid status", forged[0]?.status === "paid");
        await tx.$executeRaw`RESET ROLE`;
        await tx.$executeRaw`SET LOCAL ROLE anon`;
        const visible = await tx.$queryRaw<Array<{ normalized_input: unknown }>>`SELECT normalized_input FROM public.saju_calculations WHERE id = ${cache[0].id}::uuid`;
        check("BEFORE: anonymous role can read synthetic birth cache", visible.length === 1);
        await tx.$executeRaw`RESET ROLE`;
      }

      const migration = readFileSync("prisma/migrations/20261012000000_security_hardening/migration.sql", "utf8");
      const statements = migration.match(/CREATE TABLE[\s\S]*?;\n|CREATE INDEX[^\n]*;\n|DO \$\$[\s\S]*?END \$\$;/g);
      assert.equal(statements?.length, 3);
      // After deployment, verify the live grants without reapplying the fix or
      // ever restoring unsafe browser access. Before deployment, test then roll back.
      if (!hardened) for (const sql of statements!) await tx.$executeRawUnsafe(sql);
      await tx.$executeRawUnsafe('CREATE TABLE public.security_future_probe (id TEXT)');
      const future = await tx.$queryRaw<Array<{ anon: boolean; authenticated: boolean }>>`SELECT has_table_privilege('anon', 'public.security_future_probe', 'SELECT') AS anon, has_table_privilege('authenticated', 'public.security_future_probe', 'SELECT') AS authenticated`;
      check("future tables do not regain browser access", !future[0].anon && !future[0].authenticated);
      await tx.$executeRawUnsafe("CREATE FUNCTION public.security_future_function() RETURNS boolean LANGUAGE sql SECURITY DEFINER AS 'SELECT true'");
      const futureFunction = await tx.$queryRaw<Array<{ anon: boolean; authenticated: boolean }>>`SELECT has_function_privilege('anon', 'public.security_future_function()', 'EXECUTE') AS anon, has_function_privilege('authenticated', 'public.security_future_function()', 'EXECUTE') AS authenticated`;
      check("future privileged functions are not public RPCs", !futureFunction[0].anon && !futureFunction[0].authenticated);
      const permissions = await tx.$queryRaw<Array<{ name: string; role: string; privilege: string; allowed: boolean }>>`
        SELECT c.relname::text AS name, r.role, p.privilege, has_table_privilege(r.role, c.oid, p.privilege) AS allowed
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        CROSS JOIN (VALUES ('anon'), ('authenticated')) r(role)
        CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) p(privilege)
        WHERE n.nspname = 'public' AND c.relname IN ('User', 'SajuProfile', 'Product', 'Order', 'Report', 'SecurityRateLimit', '_prisma_migrations', 'products', 'orders', 'gifts', 'fortune_reports', 'fortune_letters', 'saju_calculations')
      `;
      check("all 13 tables and both browser roles checked", permissions.length === 130);
      for (const permission of permissions) check(`AFTER: ${permission.role} cannot ${permission.privilege} ${permission.name}`, !permission.allowed);
      const rls = await tx.$queryRaw<Array<{ name: string; enabled: boolean }>>`SELECT c.relname::text AS name, c.relrowsecurity AS enabled FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('User','SajuProfile','Product','Order','Report','SecurityRateLimit','_prisma_migrations','products','orders','gifts','fortune_reports','fortune_letters','saju_calculations')`;
      for (const table of rls) check(`AFTER: RLS enabled on ${table.name}`, table.enabled);

      // Execute denial, not just catalog assertions. Savepoints preserve the parent
      // transaction after the expected PostgreSQL 42501 permission error.
      for (const role of ["anon", "authenticated"]) {
        for (const sql of ["SELECT normalized_input FROM public.saju_calculations WHERE false", "UPDATE public.orders SET status='paid' WHERE false", "SELECT id FROM public.\"Report\" WHERE false"]) {
          check(`AFTER: actual ${role} SQL denied`, await deniedForRole(role as "anon" | "authenticated", () => tx.$queryRawUnsafe(sql)));
        }
      }
      // The server DB role still works, and the atomic counter stops at its limit.
      const key = fixture;
      for (let index = 0; index < 7; index++) {
        const counter = await tx.$queryRaw<Array<{ hits: number }>>`INSERT INTO "SecurityRateLimit" ("key","hits","resetAt") VALUES (${key},1,NOW()+INTERVAL '1 hour') ON CONFLICT ("key") DO UPDATE SET "hits"="SecurityRateLimit"."hits"+1 WHERE "SecurityRateLimit"."hits"<3 RETURNING "hits"`;
        check(`rate counter attempt ${index + 1}`, index < 3 ? counter[0]?.hits === index + 1 : counter.length === 0);
      }
      throw rollback;
    }, { timeout: 60000, maxWait: 15000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally { await db.$disconnect(); }
  const verifyDb = createPrismaClient({ datasourceUrl: url.toString() });
  try {
    const remaining = await verifyDb.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) FROM auth.users WHERE id=${userId}::uuid`;
    check("synthetic auth identity fully rolled back", remaining[0].count === BigInt(0));
    const leftovers = await verifyDb.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) FROM public.orders WHERE order_id=${fixture}`;
    check("synthetic payment fully rolled back", leftovers[0].count === BigInt(0));
  } finally { await verifyDb.$disconnect(); }
  console.log(`\n${passed} PASS; ${hardened ? "deployed permissions verified" : "migration only tested, not deployed"}; all test data and probe objects rolled back`);
}
main().catch(() => { console.error("DB security regression failed (connection/customer details withheld)"); process.exitCode = 1; });
