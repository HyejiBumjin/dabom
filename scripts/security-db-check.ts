import { loadEnvConfig } from "@next/env";
import { createPrismaClient } from "../prisma/client.cjs";

loadEnvConfig(process.cwd());

// Catalog inspection only: no customer rows, credentials, or session tokens are read.
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  const connection = new URL(process.env.DATABASE_URL);
  if (connection.hostname.endsWith(".pooler.supabase.com")) {
    connection.port = "5432";
    connection.searchParams.delete("pgbouncer");
  }
  const db = createPrismaClient({ datasourceUrl: connection.toString() });
  try {
    const result = await db.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const tables = await tx.$queryRaw<Array<Record<string, unknown>>>`
        SELECT c.relname::text AS name, c.relrowsecurity AS rls,
          has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
          has_table_privilege('anon', c.oid, 'INSERT') AS anon_insert,
          has_table_privilege('anon', c.oid, 'UPDATE') AS anon_update,
          has_table_privilege('anon', c.oid, 'DELETE') AS anon_delete,
          has_table_privilege('anon', c.oid, 'TRUNCATE') AS anon_truncate,
          has_table_privilege('authenticated', c.oid, 'SELECT') AS auth_select,
          has_table_privilege('authenticated', c.oid, 'INSERT') AS auth_insert,
          has_table_privilege('authenticated', c.oid, 'UPDATE') AS auth_update,
          has_table_privilege('authenticated', c.oid, 'DELETE') AS auth_delete
          , has_table_privilege('authenticated', c.oid, 'TRUNCATE') AS auth_truncate
          , has_any_column_privilege('anon', c.oid, 'SELECT') AS anon_column_select
          , has_any_column_privilege('anon', c.oid, 'INSERT') AS anon_column_insert
          , has_any_column_privilege('anon', c.oid, 'UPDATE') AS anon_column_update
          , has_any_column_privilege('authenticated', c.oid, 'SELECT') AS auth_column_select
          , has_any_column_privilege('authenticated', c.oid, 'INSERT') AS auth_column_insert
          , has_any_column_privilege('authenticated', c.oid, 'UPDATE') AS auth_column_update
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') ORDER BY c.relname
      `;
      const policies = await tx.$queryRaw<Array<Record<string, unknown>>>`
        SELECT tablename::text, policyname::text, roles::text, cmd, qual, with_check
        FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname
      `;
      const functions = await tx.$queryRaw<Array<Record<string, unknown>>>`
        SELECT p.proname::text AS name, p.prosecdef AS security_definer,
          has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_execute
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.prosecdef ORDER BY p.proname
      `;
      const transport = await tx.$queryRaw<Array<{ ssl: boolean }>>`SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()`;
      return { tables, policies, functions, databaseBackendUsesSsl: transport[0]?.ssl === true, transportNote: "pg_stat_ssl describes the DB backend connection; a pooler may terminate client TLS separately." };
    });
    console.log(JSON.stringify(result, null, 2));
    const required = ["User", "SajuProfile", "Product", "Order", "Report", "SecurityRateLimit", "_prisma_migrations"];
    const internal = new Set([...required, "products", "orders", "gifts", "fortune_reports", "fortune_letters", "saju_calculations"]);
    const missing = required.filter(name => !result.tables.some(table => table.name === name));
    const unsafe = result.tables.filter(table => internal.has(String(table.name)) && (!table.rls || Object.entries(table).some(([key, value]) => /^(anon|auth)_/.test(key) && value)));
    if (missing.length || unsafe.length) {
      console.error(JSON.stringify({ missingRequiredTables: missing, unsafeTables: unsafe.map(table => table.name) }));
      process.exitCode = 1;
    } else {
      console.log("PASS required tables, RLS and browser table privileges");
    }
  } finally { await db.$disconnect(); }
}

main().catch(() => { console.error("Database security inspection failed (connection details withheld)"); process.exitCode = 1; });
