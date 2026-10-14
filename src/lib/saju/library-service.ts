import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { KoreanPolicyAdapter } from "@/lib/saju/korean-policy-adapter";
import { getReportPrompt } from "@/lib/prompts/v6";
import { getConfiguredReportModel } from "@/lib/llm/report-config";
import { SAJU_PRODUCT_CODE, type ProfileInput } from "@/lib/saju/profile-input";

type Database = Prisma.TransactionClient;
// Concurrent confirmation retries can queue behind the same order/report lock.
export const PAYMENT_TRANSACTION_OPTIONS = { maxWait: 15_000, timeout: 15_000 };

export function profileBirthKey(input: ProfileInput) {
  return createHash("sha256").update(JSON.stringify([
    input.gender, input.birthDate, input.birthTime, input.calendar,
    input.calendar === "lunar" && input.isLeapMonth,
  ])).digest("hex");
}

/** Check the owner's saved fortune before updating profile metadata or preparing a purchase. */
export async function findExistingSajuReport(userId: string, input: ProfileInput, db: Database = prisma, development = process.env.NODE_ENV === "development") {
  return db.report.findFirst({
    where: {
      productCode: SAJU_PRODUCT_CODE,
      sajuProfile: { is: { userId, birthKey: profileBirthKey(input) } },
      ...(development ? {} : { order: { is: { userId, status: "PAID" } } }),
    },
    select: { id: true, sajuProfileId: true },
  });
}

export async function saveSajuProfile(userId: string, input: ProfileInput, db: Database = prisma) {
  if (!userId) throw new Error("LOGIN_REQUIRED");
  const birthKey = profileBirthKey(input);
  const where = { userId_birthKey: { userId, birthKey } };
  const existing = await db.sajuProfile.findUnique({ where, select: { id: true } });
  if (existing) {
    await db.sajuProfile.update({ where: { id: existing.id }, data: { name: input.name, relationship: input.relationship } });
    return { profileId: existing.id, existing: true };
  }
  const myeongsik = new KoreanPolicyAdapter().calculate({ ...input, birthTime: input.birthTime ?? "12:00", birthTimeKnown: Boolean(input.birthTime) });
  const data = {
    userId, birthKey, name: input.name, relationship: input.relationship,
    gender: input.gender === "male" ? "MALE" as const : "FEMALE" as const,
    birthDate: new Date(`${input.birthDate}T00:00:00.000Z`), birthTime: input.birthTime,
    isLunar: input.calendar === "lunar", isLeapMonth: input.isLeapMonth,
    myeongsik: myeongsik as unknown as Prisma.InputJsonValue,
  };
  // Database uniqueness also handles simultaneous submissions from multiple tabs.
  const profile = await db.sajuProfile.upsert({ where, create: data, update: { name: input.name, relationship: input.relationship }, select: { id: true } });
  return { profileId: profile.id, existing: false };
}

export async function ensureSajuReport(profileId: string, orderId?: string, db: Database = prisma) {
  return db.report.upsert({
    where: { sajuProfileId_productCode: { sajuProfileId: profileId, productCode: SAJU_PRODUCT_CODE } },
    create: { sajuProfileId: profileId, orderId, productCode: SAJU_PRODUCT_CODE, promptVersion: getReportPrompt().version, model: getConfiguredReportModel() },
    update: orderId ? { orderId } : {},
    select: { id: true, status: true },
  });
}

export async function prepareSajuOrder(userId: string, profileId: string, db: Database = prisma) {
  const profile = await db.sajuProfile.findFirst({ where: { id: profileId, userId }, select: { id: true } });
  if (!profile) throw new Error("PROFILE_NOT_FOUND");
  const product = await db.product.findUnique({ where: { code: SAJU_PRODUCT_CODE } });
  if (!product || !product.active || product.price <= 0) throw new Error("PRODUCT_UNAVAILABLE");
  const where = { userId_sajuProfileId_productId: { userId, sajuProfileId: profileId, productId: product.id } };
  const order = await db.order.upsert({
    where,
    create: { userId, sajuProfileId: profileId, productId: product.id, merchantUid: `saju_${randomUUID()}`, amount: product.price },
    update: {},
    include: { report: { select: { id: true } } },
  }).catch(async error => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const winner = await db.order.findUnique({ where, include: { report: { select: { id: true } } } });
      if (winner) return winner;
    }
    throw error;
  });
  if (order.status === "PAID") {
    const report = order.report ?? await ensureSajuReport(profileId, order.id, db);
    return { existing: true as const, reportId: report.id };
  }
  // Stable paymentId permits retries but only one successful charge (PortOne V2).
  return { existing: false as const, orderId: order.merchantUid, amount: order.amount ?? product.price, orderName: product.name };
}

export function verifySajuPayment(order: { merchantUid: string; amount: number | null; product: { price: number } }, payment: { id: string; amount: number; status: string; currency: string }) {
  if (!Number.isSafeInteger(payment.amount) || payment.amount <= 0) throw new Error("PAYMENT_AMOUNT_MISMATCH");
  if (payment.id !== order.merchantUid) throw new Error("PAYMENT_ID_MISMATCH");
  if (payment.amount !== (order.amount ?? order.product.price)) throw new Error("PAYMENT_AMOUNT_MISMATCH");
  if (payment.currency !== "KRW") throw new Error("PAYMENT_CURRENCY_MISMATCH");
  if (payment.status !== "PAID") throw new Error("PAYMENT_NOT_PAID");
}

export async function fulfillSajuOrder(userId: string, merchantUid: string, payment: { id: string; amount: number; status: string; currency: string }, db: Database = prisma) {
  const order = await db.order.findFirst({ where: { userId, merchantUid }, include: { product: true, sajuProfile: { select: { userId: true } } } });
  if (!order || order.sajuProfile.userId !== userId || order.product.code !== SAJU_PRODUCT_CODE) throw new Error("ORDER_NOT_FOUND");
  if (order.status === "CANCELLED") throw new Error("ORDER_CANCELLED");
  verifySajuPayment(order, payment);
  // Compare-and-update in the DB, so cancellation arriving after the read cannot
  // be overwritten by an in-flight/stale successful confirmation.
  const updated = await db.order.updateMany({ where: { id: order.id, status: { not: "CANCELLED" } }, data: { status: "PAID", paidAmount: payment.amount, paidAt: order.paidAt ?? new Date(), pgTxId: payment.id } });
  if (updated.count !== 1) throw new Error("ORDER_CANCELLED");
  return ensureSajuReport(order.sajuProfileId, order.id, db);
}
