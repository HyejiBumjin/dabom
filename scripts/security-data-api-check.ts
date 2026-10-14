import assert from "node:assert/strict";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

async function main() {
  const endpoint = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  assert.ok(endpoint && key, "Supabase public client configuration required");
  const url = new URL(endpoint);
  assert.ok(url.protocol === "https:" && url.hostname.endsWith(".supabase.co"), "Only the configured Supabase project is tested");
  const authSettings = await fetch(new URL("/auth/v1/settings", url), {
    headers: { apikey: key }, redirect: "error", signal: AbortSignal.timeout(10000),
  });
  assert.equal(authSettings.status, 200, "Public API key and Auth service must work");
  await authSettings.body?.cancel();
  console.log("PASS configured public API key and Auth service");
  const client = createClient(endpoint, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, redirect: "error", signal: AbortSignal.timeout(10000) }) },
  });
  const tables = [
    "User", "SajuProfile", "Product", "Order", "Report", "SecurityRateLimit", "_prisma_migrations",
    "products", "orders", "gifts", "fortune_reports", "fortune_letters", "saju_calculations",
  ];
  for (const table of tables) {
    // limit=0: no customer rows, counts, or content are retrieved. Require an
    // actual privilege/schema denial, not an invalid key or temporary outage.
    const { error, status } = await client.from(table).select("*").limit(0);
    assert.ok(error && [401, 403, 404].includes(status) && ["42501", "PGRST205"].includes(error.code), `Anonymous Data API must deny ${table}`);
    console.log(`PASS anonymous Data API ${table}: HTTP ${status}, ${error.code}`);
  }
  console.log(`\n${tables.length + 1} PASS; zero-row public requests only, no customer rows retrieved`);
}

main().catch(() => {
  console.error("Data API access verification failed; keys and response details withheld");
  process.exitCode = 1;
});
