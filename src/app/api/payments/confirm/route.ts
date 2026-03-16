import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { buildFortuneReport } from "@/lib/fortune/pipeline";
import { getPortOnePayment } from "@/lib/portone/server";
import { GIFT_STATUS, ORDER_STATUS, PRODUCTS } from "@/lib/constants";

const confirmSchema = z.object({
  payment_id: z.string().min(1).optional(),
  order_id: z.string().min(1),
  payment_status: z.enum(["paid", "failed", "canceled"]).optional(),
});

function getLinkedReportId(order: { report_id?: string | null; metadata?: unknown }): string | null {
  if (order.report_id) return order.report_id;
  const reportIdFromMeta = (order.metadata as { reportId?: string } | null)?.reportId;
  return reportIdFromMeta || null;
}

type SelfFortuneInput = {
  birthDate: string;
  birthTime?: string;
  gender?: string;
  name?: string;
  relationship?: string;
  calendarType?: "solar" | "lunar";
  leapMonthType?: "regular" | "leap";
  interests?: string[];
};

function normalizeStatus(status?: string): string {
  const normalized = (status || "").toUpperCase();
  if (normalized === "PAID") return ORDER_STATUS.PAID;
  if (normalized === "CANCELLED" || normalized === "CANCELED") return ORDER_STATUS.CANCELED;
  return ORDER_STATUS.FAILED;
}

export async function POST(request: Request) {
  const supabase = await createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const anonClient = await import("@/lib/supabase/server").then((m) => m.createClient());
  const {
    data: { user },
  } = await (anonClient?.auth.getUser() ?? { data: { user: null } });

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = confirmSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const { payment_id, order_id, payment_status } = parsed.data;

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("order_id", order_id)
    .eq("owner_id", user.id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  if (order.status === ORDER_STATUS.PAID) {
    if (order.product_code === PRODUCTS.FORTUNE_2026) {
      const reportId = getLinkedReportId(order);
      if (reportId) return NextResponse.json({ ok: true, reportId, alreadyPaid: true });

      const input = (order.metadata as { input?: SelfFortuneInput })?.input;
      if (!input?.birthDate) {
        return NextResponse.json({ error: "Input missing" }, { status: 400 });
      }

      const fortuneResult = await buildFortuneReport({
        input: {
          birthDate: input.birthDate,
          birthTime: input.birthTime,
          gender: input.gender,
          name: input.name,
          relationship: input.relationship,
          calendarType: input.calendarType,
          leapMonthType: input.leapMonthType,
          interests: input.interests,
        },
        supabase,
      });
      const { data: report } = await supabase
        .from("fortune_reports")
        .insert({
          owner_id: user.id,
          input,
          result: fortuneResult,
        })
        .select("id")
        .single();

      if (report?.id) {
        await supabase
          .from("orders")
          .update({
            report_id: report.id,
            metadata: { ...(order.metadata || {}), reportId: report.id },
          })
          .eq("id", order.id);
      }
      return NextResponse.json({ ok: true, reportId: report?.id, alreadyPaid: true });
    }
    if (order.product_code === PRODUCTS.GIFT_FORTUNE_2026 && order.gift_id) {
      const { data: gift } = await supabase.from("gifts").select("token").eq("id", order.gift_id).single();
      return NextResponse.json({ ok: true, giftToken: gift?.token, alreadyPaid: true });
    }
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  if (!payment_id) {
    const fallbackStatus = payment_status === "canceled" ? ORDER_STATUS.CANCELED : ORDER_STATUS.FAILED;
    await supabase
      .from("orders")
      .update({ status: fallbackStatus })
      .eq("id", order.id);
    return NextResponse.json({ error: "결제가 완료되지 않았습니다." }, { status: 400 });
  }

  let payment;
  try {
    payment = await getPortOnePayment(payment_id);
  } catch {
    await supabase
      .from("orders")
      .update({ status: ORDER_STATUS.FAILED, payment_id })
      .eq("id", order.id);
    return NextResponse.json({ error: "결제 검증 실패" }, { status: 400 });
  }

  if (payment.paymentId !== order_id && payment.id !== order_id) {
    await supabase.from("orders").update({ status: ORDER_STATUS.FAILED, payment_id }).eq("id", order.id);
    return NextResponse.json({ error: "주문 번호 불일치" }, { status: 400 });
  }

  if (payment.amount !== order.amount) {
    await supabase.from("orders").update({ status: ORDER_STATUS.FAILED, payment_id }).eq("id", order.id);
    return NextResponse.json({ error: "결제 금액 불일치" }, { status: 400 });
  }

  const verifiedStatus = normalizeStatus(payment.status);
  if (verifiedStatus !== ORDER_STATUS.PAID) {
    await supabase
      .from("orders")
      .update({ status: verifiedStatus, payment_id })
      .eq("id", order.id);
    return NextResponse.json({ error: "결제가 완료되지 않았습니다." }, { status: 400 });
  }

  await supabase
    .from("orders")
    .update({ status: ORDER_STATUS.PAID, payment_id })
    .eq("id", order.id);

  if (order.product_code === PRODUCTS.FORTUNE_2026) {
    const input = (order.metadata as { input?: SelfFortuneInput })?.input;
    if (!input?.birthDate) {
      return NextResponse.json({ error: "Input missing" }, { status: 400 });
    }

    const fortuneResult = await buildFortuneReport({
      input: {
        birthDate: input.birthDate,
        birthTime: input.birthTime,
        gender: input.gender,
        name: input.name,
        relationship: input.relationship,
        calendarType: input.calendarType,
        leapMonthType: input.leapMonthType,
        interests: input.interests,
      },
      supabase,
    });

    const { data: report } = await supabase
      .from("fortune_reports")
      .insert({
        owner_id: user.id,
        input,
        result: fortuneResult,
      })
      .select("id")
      .single();

    if (report?.id) {
      await supabase
        .from("orders")
        .update({
          report_id: report.id,
          metadata: { ...(order.metadata || {}), reportId: report.id },
        })
        .eq("id", order.id);
    }

    return NextResponse.json({ ok: true, reportId: report?.id });
  }

  if (order.product_code === PRODUCTS.GIFT_FORTUNE_2026 && order.gift_id) {
    await supabase
      .from("gifts")
      .update({ gift_status: GIFT_STATUS.ACTIVE })
      .eq("id", order.gift_id);

    const { data: gift } = await supabase
      .from("gifts")
      .select("token")
      .eq("id", order.gift_id)
      .single();

    return NextResponse.json({ ok: true, giftToken: gift?.token });
  }

  return NextResponse.json({ ok: true });
}
