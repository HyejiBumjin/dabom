import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { createPrismaClient } from "../prisma/client.cjs";
import { SAJU_PRODUCT_CODE } from "../src/lib/saju/profile-input";

// Real Supabase/production HTTP, disposable email identity, synthetic data only.
// No browser cookies, real Kakao B identity, email delivery, payments or LLM calls.
type Fixture = { profileId: string; reportId: string; name: string; birthDate: string; birthTime: string | null };
type Manifest = { run: string; phase: string; profiles: Fixture[]; temporaryAccount?: { authUserId: string; accountId?: string; profileId?: string; cleaned?: boolean } };

async function main() {
  loadEnvConfig(process.cwd());
  const file = ".vercel/security-account-fixtures.json";
  const manifest = JSON.parse(await readFile(file, "utf8")) as Manifest;
  assert.match(manifest.run, /^1013-[a-f0-9]{6}$/);
  assert.equal(manifest.phase, "reports", "Prepare disposable fixtures before running the authenticated check");
  assert.ok(manifest.profiles.length === 3 && manifest.profiles.every(p => p.name.startsWith(`보안검사-${manifest.run}-A-`) && p.reportId));
  const envFile = await readFile(".vercel/.env.production.local", "utf8");
  function savedValue(name: string) {
    const line = envFile.split(/\r?\n/).find(line => line.startsWith(`${name}=`));
    const value = line?.slice(name.length + 1) ?? "";
    return value.startsWith('"') ? JSON.parse(value) as string : value;
  }
  const authUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  assert.equal(new URL(authUrl).hostname, "euelsonamrepipxvfayy.supabase.co");
  assert.equal(savedValue("NEXT_PUBLIC_SUPABASE_URL"), authUrl);
  const key = savedValue("SUPABASE_SERVICE_ROLE_KEY");
  assert.match(key, /^(?:eyJ[\w-]+\.[\w-]+\.[\w-]+|sb_secret_[\w-]+)$/);
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  assert.ok(publicKey);
  const admin = createClient(authUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const jar = new Map<string, string>();
  const session = createServerClient(authUrl, publicKey, {
    cookieOptions: { secure: true, sameSite: "lax" },
    cookies: { getAll: () => Array.from(jar, ([name, value]) => ({ name, value })), setAll: (cookies: Array<{ name: string; value: string }>) => cookies.forEach(({ name, value }) => { if (value) jar.set(name, value); else jar.delete(name); }) },
  });
  const db = createPrismaClient();
  const name = `보안검사-${manifest.run}-B`;
  const email = `security-${manifest.run}-${randomUUID()}@example.invalid`;
  const password = randomBytes(32).toString("base64url");
  const target = "https://dabom-letter.com";
  const results: Array<{ name: string; pass: true }> = [];
  let authUserId: string | undefined, accountId: string | undefined, profileId: string | undefined;
  let reportId: string | undefined, merchantUid: string | undefined;
  const startedAt = Date.now();
  function pass(name: string) { results.push({ name, pass: true }); console.log(`PASS ${name}`); }
  async function saveManifest() { await writeFile(file, JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600 }); }
  async function request(path: string, body?: unknown, extraHeaders: Record<string, string> = {}) {
    assert.ok(path.startsWith("/api/") || path.startsWith("/saju/"));
    const response = await fetch(target + path, {
      method: body === undefined ? "GET" : "POST", redirect: "manual", signal: AbortSignal.timeout(20_000),
      headers: { cookie: Array.from(jar, ([k, v]) => `${k}=${v}`).join("; "), origin: target, ...(body === undefined ? {} : { "content-type": "application/json" }), ...extraHeaders },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    return { status: response.status, text, headers: response.headers };
  }
  try {
    // Admin creation with email_confirm does not send a confirmation email.
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nickname: name } });
    assert.ok(!created.error && created.data.user?.role === "authenticated");
    authUserId = created.data.user.id;
    manifest.temporaryAccount = { authUserId }; await saveManifest();
    const signedIn = await session.auth.signInWithPassword({ email, password });
    assert.ok(!signedIn.error && signedIn.data.user?.id === authUserId && !signedIn.data.user.is_anonymous);
    const verified = await session.auth.getUser();
    assert.equal(verified.data.user?.id, authUserId);
    pass("temporary B uses a real verified non-anonymous Supabase session (email; not Kakao)");

    const first = manifest.profiles[0];
    const ownerA = await db.sajuProfile.findUniqueOrThrow({ where: { id: first.profileId }, select: { userId: true, name: true } });
    assert.equal(ownerA.name, first.name); assert.ok(ownerA.userId);
    const input = { name, relationship: "FRIEND", gender: "female", birthDate: first.birthDate, birthTime: first.birthTime, calendar: "solar", isLeapMonth: false, userId: ownerA.userId, role: "admin", status: "PAID" };
    const saved = await request("/api/saju/profiles", input);
    assert.equal(saved.status, 201);
    const savedData = JSON.parse(saved.text) as { profileId: string; existingReport?: boolean };
    profileId = savedData.profileId;
    assert.match(profileId, /^[a-z0-9]{20,40}$/);
    manifest.temporaryAccount.profileId = profileId; await saveManifest();
    assert.notEqual(profileId, first.profileId); assert.ok(!savedData.existingReport);
    pass("same birth data belongs to a separate B profile, never A's duplicate report");
    const identity = await request("/api/auth/account");
    assert.equal(identity.status, 200); assert.equal(identity.headers.get("cache-control"), "private, no-store");
    const identityData = JSON.parse(identity.text) as { accountId: string };
    assert.deepEqual(Object.keys(identityData), ["accountId"]);
    accountId = identityData.accountId; assert.notEqual(accountId, ownerA.userId);
    manifest.temporaryAccount.accountId = accountId; await saveManifest();
    const ownProfile = await db.sajuProfile.findUniqueOrThrow({ where: { id: profileId }, select: { userId: true, name: true, relationship: true } });
    assert.equal(ownProfile.userId, accountId); assert.equal(ownProfile.name, name); assert.equal(ownProfile.relationship, "FRIEND");
    pass("overposted A owner ID/admin/PAID fields cannot change verified B ownership");
    pass("real authenticated account endpoint exposes only current account ID with no-store");

    for (const fixture of manifest.profiles) {
      for (const path of [`/saju/profiles/${fixture.profileId}`, `/saju/profiles/${fixture.profileId}/checkout`, `/saju/reports/${fixture.reportId}`]) {
        const denied = await request(path);
        assert.equal(denied.status, 404); assert.ok(!denied.text.includes(fixture.name));
        pass(`B cannot read A ${path.includes("/reports/") ? "report page" : path.endsWith("checkout") ? "checkout" : "profile"}`);
      }
      const deniedApi = await request(`/api/saju/reports/${fixture.reportId}`);
      assert.equal(deniedApi.status, 404); assert.ok(!deniedApi.text.includes(fixture.name));
      assert.deepEqual(Object.keys(JSON.parse(deniedApi.text)), ["error"]);
      pass("B cannot read A report API or its content/status metadata");
      const deniedGeneration = await request(`/api/saju/reports/${fixture.reportId}/generate`, {});
      assert.equal(deniedGeneration.status, 404);
      pass("B cannot generate A completed fixture (no model call)");
      const deniedCreation = await request(`/api/saju/profiles/${fixture.profileId}/reports`, {});
      assert.equal(deniedCreation.status, 404);
      pass("B cannot create/reuse a report on A profile");
    }
    const prefetchHeaders = { rsc: "1", "next-router-prefetch": "1" };
    let foreignPrefetch = await request(`/saju/reports/${first.reportId}`, undefined, prefetchHeaders);
    if (foreignPrefetch.status === 307) {
      const canonical = new URL(foreignPrefetch.headers.get("location")!, target);
      assert.equal(canonical.origin, target);
      assert.equal(canonical.pathname, `/saju/reports/${first.reportId}`);
      foreignPrefetch = await request(canonical.pathname + canonical.search, undefined, prefetchHeaders);
    }
    await writeFile("docs/security/account-rsc-prefetch-2026-10-13.json", JSON.stringify({ status: foreignPrefetch.status, fixtureNameLeaked: foreignPrefetch.text.includes(first.name), notFoundMarker: foreignPrefetch.text.includes("NEXT_HTTP_ERROR_FALLBACK;404"), bodyLength: foreignPrefetch.text.length }, null, 2) + "\n");
    // Partial Next prefetch may return a 200 shell without executing dynamic
    // content. The normal page/API 404 controls above must still pass.
    assert.ok([200, 404].includes(foreignPrefetch.status));
    assert.ok(manifest.profiles.every(p => !foreignPrefetch.text.includes(p.name)));
    assert.ok(!foreignPrefetch.text.includes(ownerA.userId));
    assert.ok(!/paragraphs|COMPLETED|birthDate|birthTime|myeongsik/.test(foreignPrefetch.text));
    pass("B RSC prefetch exposes no A identity, profile or report data; normal page/API deny access");
    const unpaid = await request(`/api/saju/profiles/${profileId}/reports`, {});
    assert.equal(unpaid.status, 402); assert.ok(!("reportId" in JSON.parse(unpaid.text)));
    pass("B's own unpaid profile cannot obtain a production report");

    // Positive control uses a completed fixed message, never a provider payment.
    merchantUid = `security-account-${manifest.run}-${randomUUID()}`;
    const message = `${name} 전용 보안 검사 메시지야. 실제 결제나 모델 호출은 없어.`;
    const fixture = await db.$transaction(async tx => {
      assert.equal(await tx.order.count({ where: { sajuProfileId: profileId } }), 0);
      assert.equal(await tx.report.count({ where: { sajuProfileId: profileId } }), 0);
      const product = await tx.product.findUniqueOrThrow({ where: { code: SAJU_PRODUCT_CODE }, select: { id: true, price: true } });
      const order = await tx.order.create({ data: { userId: accountId!, sajuProfileId: profileId!, productId: product.id, merchantUid: merchantUid!, status: "PAID", amount: product.price } });
      return tx.report.create({ data: { sajuProfileId: profileId!, orderId: order.id, productCode: SAJU_PRODUCT_CODE, model: "security-fixture-no-provider", promptVersion: "security-account-fixture", status: "COMPLETED", content: { paragraphs: [message], meta: { presentation: "letter", charCount: message.length, beats: [], termsUsed: [] } } }, select: { id: true } });
    });
    reportId = fixture.id;
    const own = await request(`/api/saju/reports/${reportId}`);
    assert.equal(own.status, 200); assert.ok(own.text.includes(message));
    const ownAgain = await request(`/api/saju/reports/${reportId}`);
    assert.equal(ownAgain.status, 200); assert.equal(ownAgain.text, own.text);
    pass("B can read and reread its own fixed purchased report without regenerating");
    const library = await request("/saju/library");
    assert.equal(library.status, 200); assert.ok(library.text.includes(name));
    assert.ok(manifest.profiles.every(p => !library.text.includes(p.name)));
    pass("B production library contains B fixture and excludes all A fixtures");
    const duplicate = await request("/api/saju/profiles", { ...input, name: `${name}-새별명`, relationship: "SELF" });
    assert.equal(duplicate.status, 200); assert.equal(JSON.parse(duplicate.text).reportId, reportId);
    pass("B duplicate flow reuses B report and never A report");
  } finally {
    try {
      // Recover an API write even when its response timed out before returning IDs.
      if (authUserId && !accountId) accountId = (await db.user.findUnique({ where: { kakaoId: authUserId }, select: { id: true } }))?.id;
      if (accountId && !profileId) profileId = (await db.sajuProfile.findFirst({ where: { userId: accountId, name }, select: { id: true } }))?.id;
      if (profileId && accountId) {
        await db.$transaction(async tx => {
          const found = await tx.sajuProfile.findUnique({ where: { id: profileId }, select: { userId: true, name: true, reports: { select: { model: true } }, orders: { select: { merchantUid: true } } } });
          if (found) {
            assert.equal(found.userId, accountId); assert.equal(found.name, name);
            assert.ok(found.reports.every(r => r.model === "security-fixture-no-provider"));
            assert.ok(found.orders.every(o => o.merchantUid.startsWith(`security-account-${manifest.run}-`)));
            await tx.report.deleteMany({ where: { sajuProfileId: profileId, model: "security-fixture-no-provider" } });
            await tx.order.deleteMany({ where: { sajuProfileId: profileId, merchantUid: { startsWith: `security-account-${manifest.run}-` } } });
            await tx.sajuProfile.delete({ where: { id: profileId } });
          }
          await tx.user.deleteMany({ where: { id: accountId, kakaoId: authUserId, nickname: name, sajuProfiles: { none: {} }, orders: { none: {} } } });
          const counterKeys: string[] = [];
          for (const scope of ["profiles", "report-create"]) {
            for (let bucket = Math.floor(startedAt / 3_600_000); bucket <= Math.floor(Date.now() / 3_600_000); bucket++) counterKeys.push(createHash("sha256").update(`${accountId}:${scope}:${bucket}`).digest("hex"));
          }
          await tx.securityRateLimit.deleteMany({ where: { key: { in: counterKeys } } });
        });
        assert.equal(await db.sajuProfile.count({ where: { id: profileId } }), 0);
        assert.equal(await db.user.count({ where: { kakaoId: authUserId } }), 0);
        pass("temporary B app profile/order/report/account removed; real A preserved");
      }
    } finally {
      if (authUserId) {
        const removed = await admin.auth.admin.deleteUser(authUserId);
        assert.ok(!removed.error);
        assert.ok((await admin.auth.admin.getUserById(authUserId)).error);
        const removedSession = await request("/api/auth/account");
        assert.equal(removedSession.status, 401);
        pass("temporary B Auth user removed and its old real session rejected");
        manifest.temporaryAccount!.cleaned = true; await saveManifest();
      }
      jar.clear(); await db.$disconnect();
      await writeFile("docs/security/account-authenticated-api-2026-10-13.json", JSON.stringify({ scope: "real production HTTP; real Kakao A fixtures versus temporary email-auth B; not a second Kakao browser login", results, paymentCalls: 0, llmCalls: 0, temporaryAccountCleaned: manifest.temporaryAccount?.cleaned ?? false }, null, 2) + "\n");
    }
  }
  console.log(`\n${results.length} PASS (real verified Supabase B, synthetic data; no second Kakao browser account)`);
}

main().catch(() => { console.error("Authenticated account check failed; inspect sanitized PASS log and ignored recovery manifest. No token, credentials or raw response body are logged."); process.exitCode = 1; });
