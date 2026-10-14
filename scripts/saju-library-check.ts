import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { createPrismaClient } from "../prisma/client.cjs";
import { profileInputSchema, SAJU_PRODUCT_CODE } from "../src/lib/saju/profile-input";
import { profileBirthKey, findExistingSajuReport, saveSajuProfile, prepareSajuOrder, ensureSajuReport, fulfillSajuOrder, verifySajuPayment } from "../src/lib/saju/library-service";
import { canAccessSajuProfile, canReadSajuReport } from "../src/lib/saju/account";
import { safeReturnPath } from "../src/lib/auth-return-path";

loadEnvConfig(process.cwd());
let passed = 0;
function check(name: string, condition: unknown) { assert.ok(condition, name); passed++; console.log(`PASS ${name}`); }
const input = profileInputSchema.parse({ name: "검사용 인물", relationship: "SELF", gender: "female", birthDate: "1995-05-20", birthTime: "20:20", calendar: "solar", isLeapMonth: false });
check("표시 이름과 관계를 바꿔도 출생 정보는 같은 키", profileBirthKey(input) === profileBirthKey({ ...input, name: "다른 별명", relationship: "FAMILY" }));
check("시각 모름과 정오 출생은 별개", profileBirthKey({ ...input, birthTime: null }) !== profileBirthKey({ ...input, birthTime: "12:00" }));
check("성별이 다르면 별개", profileBirthKey(input) !== profileBirthKey({ ...input, gender: "male" }));
check("양력의 숨겨진 윤달 플래그는 무시", profileBirthKey(input) === profileBirthKey({ ...input, isLeapMonth: true }));
check("잘못된 시각 거부", !profileInputSchema.safeParse({ ...input, birthTime: "25:99" }).success);
check("클라이언트가 보낸 소유자 ID 제거", !("userId" in profileInputSchema.parse({ ...input, userId: "someone-else" })));
check("로그인 복귀 경로 유지", safeReturnPath("/saju?x=1") === "/saju?x=1");
check("외부 로그인 리다이렉트 차단", safeReturnPath("//evil.invalid") === "/saju/library" && safeReturnPath("/\\evil.invalid") === "/saju/library");
check("다른 계정 소유자는 열람 불가", !canAccessSajuProfile({ userId: "A" }, { id: "B" }));
check("로그아웃 상태에서는 본인 프로필도 열람 불가", !canAccessSajuProfile({ userId: "A" }, null));
check("익명 프로필은 로그인해도 열람 불가", !canAccessSajuProfile({ userId: null }, { id: "A" }));
check("개발 환경도 익명 리포트 열람 불가", !canReadSajuReport({ sajuProfile: { userId: null }, order: null }, null, true));
check("개발 환경도 로그인 없이 계정 소유 리포트 열람 불가", !canReadSajuReport({ sajuProfile: { userId: "A" }, order: null }, null, true));
check("개발 테스트 결제 생략은 로그인한 소유자만 허용", canReadSajuReport({ sajuProfile: { userId: "A" }, order: null }, { id: "A" }, true));
check("운영 환경의 익명 리포트 열람 불가", !canReadSajuReport({ sajuProfile: { userId: null }, order: null }, null, false));
check("미결제 리포트 열람 불가", !canReadSajuReport({ sajuProfile: { userId: "A" }, order: null }, { id: "A" }, false));
check("다른 계정의 결제는 권한이 아님", !canReadSajuReport({ sajuProfile: { userId: "A" }, order: { userId: "B", status: "PAID" } }, { id: "A" }, false));
check("본인 결제만 저장 결과 열람", canReadSajuReport({ sajuProfile: { userId: "A" }, order: { userId: "A", status: "PAID" } }, { id: "A" }, false));
const paid = { id: "payment-test", amount: 3900, status: "PAID", currency: "KRW" };
const order = { merchantUid: "payment-test", amount: 3900, product: { price: 5000 } };
verifySajuPayment(order, paid);
check("결제 금액은 구매 당시 가격으로 확인", true);
for (const [name, payment] of [
  ["다른 결제 ID 거부", { ...paid, id: "other" }],
  ["조작한 금액 거부", { ...paid, amount: 1 }],
  ["다른 통화 거부", { ...paid, currency: "USD" }],
  ["실패한 결제 거부", { ...paid, status: "FAILED" }],
] as const) { assert.throws(() => verifySajuPayment(order, payment)); check(name, true); }

async function databaseChecks() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the isolated transaction checks.");
  const url = new URL(process.env.DATABASE_URL);
  if (url.hostname.endsWith(".pooler.supabase.com")) { url.port = "5432"; url.searchParams.delete("pgbouncer"); }
  const db = createPrismaClient({ datasourceUrl: url.toString() });
  const fixture = `library-check-${randomUUID()}`;
  const rollback = new Error("ROLLBACK_LIBRARY_CHECK");
  try {
    await db.$transaction(async tx => {
      await assert.rejects(() => saveSajuProfile("", input, tx), /LOGIN_REQUIRED/);
      check("계정 없이 프로필 저장 차단", true);
      const ownerA = await tx.user.create({ data: { kakaoId: `${fixture}-A`, nickname: "검사 A" } });
      const ownerB = await tx.user.create({ data: { kakaoId: `${fixture}-B`, nickname: "검사 B" } });
      await tx.product.upsert({ where: { code: SAJU_PRODUCT_CODE }, create: { code: SAJU_PRODUCT_CODE, name: "2026 운세", price: 3900, active: true }, update: {} });
      const first = await saveSajuProfile(ownerA.id, input, tx);
      const duplicate = await saveSajuProfile(ownerA.id, { ...input, name: "검사 가족", relationship: "FAMILY" }, tx);
      check("같은 계정과 정보는 프로필 재사용", first.profileId === duplicate.profileId && duplicate.existing);
      const profile = await tx.sajuProfile.findUniqueOrThrow({ where: { id: first.profileId } });
      check("관계와 표시 이름 저장", profile.relationship === "FAMILY" && profile.name === "검사 가족");
      const secondOwner = await saveSajuProfile(ownerB.id, input, tx);
      check("다른 계정은 별도 프로필과 구매권", first.profileId !== secondOwner.profileId);
      await assert.rejects(() => prepareSajuOrder(ownerB.id, first.profileId, tx), /PROFILE_NOT_FOUND/);
      check("다른 계정의 프로필 결제 준비 차단", true);
      const prepared = await prepareSajuOrder(ownerA.id, first.profileId, tx);
      const again = await prepareSajuOrder(ownerA.id, first.profileId, tx);
      assert.ok(!prepared.existing && !again.existing);
      check("재시도는 같은 주문과 paymentId 사용", prepared.orderId === again.orderId && prepared.amount === again.amount);
      const unpaidReport = await ensureSajuReport(first.profileId, undefined, tx);
      check("운영 중복 안내는 미결제 리포트를 구매 내역으로 표시하지 않음", await findExistingSajuReport(ownerA.id, input, tx, false) === null);
      check("개발 환경에서는 보관된 테스트 운세 중복 안내", (await findExistingSajuReport(ownerA.id, input, tx, true))?.id === unpaidReport.id);
      check("다른 계정의 기존 운세를 중복으로 안내하지 않음", await findExistingSajuReport(ownerB.id, input, tx, true) === null);
      const verified = { id: prepared.orderId, amount: prepared.amount, status: "PAID", currency: "KRW" };
      await assert.rejects(() => fulfillSajuOrder(ownerA.id, prepared.orderId, { ...verified, amount: 1 }, tx), /PAYMENT_AMOUNT_MISMATCH/);
      check("금액 검증 실패 시 주문은 미결제", (await tx.order.findUniqueOrThrow({ where: { merchantUid: prepared.orderId } })).status === "READY");
      const report = await fulfillSajuOrder(ownerA.id, prepared.orderId, verified, tx);
      await tx.report.update({ where: { id: report.id }, data: { status: "COMPLETED", content: { paragraphs: ["저장한 결과"] } } });
      const retry = await fulfillSajuOrder(ownerA.id, prepared.orderId, verified, tx);
      const existing = await prepareSajuOrder(ownerA.id, first.profileId, tx);
      check("재확인과 재조회 모두 같은 리포트 반환", retry.id === report.id && existing.existing && existing.reportId === report.id);
      check("재조회 시 저장한 내용 보존", (await tx.report.findUniqueOrThrow({ where: { id: report.id } })).status === "COMPLETED");
      check("이름과 관계가 달라도 출생 정보와 연도로 중복 안내", (await findExistingSajuReport(ownerA.id, { ...input, name: "새 별명", relationship: "FRIEND" }, tx, false))?.id === report.id);
      const preserved = await tx.sajuProfile.findUniqueOrThrow({ where: { id: first.profileId } });
      check("중복 확인만으로 기존 운세함의 이름과 관계를 바꾸지 않음", preserved.name === "검사 가족" && preserved.relationship === "FAMILY");
      check("중복 주문과 리포트 없음", await tx.order.count({ where: { userId: ownerA.id } }) === 1 && await tx.report.count({ where: { sajuProfileId: first.profileId } }) === 1);
      await assert.rejects(() => fulfillSajuOrder(ownerB.id, prepared.orderId, verified, tx), /ORDER_NOT_FOUND/);
      check("다른 계정의 구매 확인 차단", true);
      check("개발 재조회도 저장된 리포트 재사용", (await ensureSajuReport(first.profileId, undefined, tx)).id === report.id);
      throw rollback;
    }, { timeout: 60000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally { await db.$disconnect(); }
  const verifyDb = createPrismaClient({ datasourceUrl: url.toString() });
  try { check("테스트 계정과 모의 결제를 남기지 않음", await verifyDb.user.count({ where: { kakaoId: { startsWith: fixture } } }) === 0); }
  finally { await verifyDb.$disconnect(); }
}

databaseChecks().then(() => console.log(`\n${passed} PASS`)).catch(error => { console.error(error instanceof Error ? error.message : "Library check failed"); process.exitCode = 1; });
