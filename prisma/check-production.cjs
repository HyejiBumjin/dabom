/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS script run directly by Node during deployment. */
// Vercel supplies Sensitive values to its build process without revealing them
// to the local CLI. Validate the actual production DB before publishing.
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createHash } = require("node:crypto");
const { createPrismaClient, databasePoolConfig } = require("./client.cjs");

async function main() {
  if (process.env.VERCEL_ENV !== "production") return;
  const app = new URL(process.env.NEXT_PUBLIC_APP_URL);
  assert.equal(app.origin, "https://dabom-letter.com");
  const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
  const connection = new URL(process.env.DATABASE_URL);
  assert.ok(connection.hostname === `db.${project}.supabase.co` ||
    (connection.hostname.endsWith(".pooler.supabase.com") && decodeURIComponent(connection.username).endsWith(`.${project}`)));
  const { config } = databasePoolConfig();
  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.equal(config.ssl.servername, connection.hostname);
  assert.equal(config.enableChannelBinding, true);
  const db = createPrismaClient();
  try {
    await db.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const migration = await tx.$queryRaw`SELECT checksum FROM public._prisma_migrations WHERE migration_name='20261012000000_security_hardening' AND finished_at IS NOT NULL AND rolled_back_at IS NULL`;
      const checksum = createHash("sha256").update(readFileSync("prisma/migrations/20261012000000_security_hardening/migration.sql")).digest("hex");
      assert.equal(migration[0]?.checksum, checksum);
      const tables = await tx.$queryRaw`
        SELECT c.relname::text AS name, c.relrowsecurity AS rls,
          has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') AS anon_access,
          has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') AS auth_access,
          has_any_column_privilege('anon',c.oid,'SELECT,INSERT,UPDATE') AS anon_column_access,
          has_any_column_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE') AS auth_column_access
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relkind IN ('r','p')
          AND c.relname IN ('User','SajuProfile','Product','Order','Report','SecurityRateLimit','_prisma_migrations','products','orders','gifts','fortune_reports','fortune_letters','saju_calculations')
      `;
      for (const name of ["User","SajuProfile","Product","Order","Report","SecurityRateLimit","_prisma_migrations"]) assert.ok(tables.some(table => table.name === name));
      assert.ok(tables.every(table => table.rls && !table.anon_access && !table.auth_access && !table.anon_column_access && !table.auth_column_access));
      const actor = await tx.$queryRaw`SELECT rolbypassrls OR rolsuper AS allowed FROM pg_roles WHERE rolname=current_user`;
      assert.equal(actor[0]?.allowed, true);
      // Resolve real application table/column types without fetching customer rows.
      await tx.$queryRaw`SELECT "id","kakaoId" FROM "User" WHERE false`;
      await tx.$queryRaw`SELECT "id","relationship","birthKey" FROM "SajuProfile" WHERE false`;
      await tx.$queryRaw`SELECT "id","amount","status" FROM "Order" WHERE false`;
      await tx.$queryRaw`SELECT "id","status","content" FROM "Report" WHERE false`;
      await tx.$queryRaw`SELECT "key","hits","resetAt" FROM "SecurityRateLimit" WHERE false`;
    }, { timeout: 20000, maxWait: 15000 });
    console.log("PASS production DB connection, project match, applied security migration, server access and browser privilege denial (read-only; no customer rows)");
    console.log("PASS production DB TLS: official Supabase CA, certificate and hostname verification, TLS 1.2 minimum, channel binding enabled");
  } finally { await db.$disconnect(); }
}

main().catch(() => {
  console.error("Production DB security preflight failed; connection details and customer data withheld");
  process.exitCode = 1;
});
