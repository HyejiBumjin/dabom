import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { buildFortuneReport } from "@/lib/fortune/pipeline";
import { GIFT_STATUS } from "@/lib/constants";

const reportCreateSchema = z.object({
  mode: z.enum(["self", "gift"]),
  giftToken: z.string().min(1).optional(),
  input: z.object({
    birthDate: z.string().min(1),
    birthTime: z.string().optional(),
    gender: z.string().optional(),
    name: z.string().optional(),
    relationship: z.string().optional(),
    calendarType: z.enum(["solar", "lunar"]).optional(),
    leapMonthType: z.enum(["regular", "leap"]).optional(),
    interests: z.array(z.string()).max(3).optional(),
  }),
});

export async function POST(request: Request) {
  const supabase = await createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const raw = await request.json().catch(() => null);
  const parsed = reportCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { mode, giftToken, input } = parsed.data;

  if (mode === "self") {
    const anonClient = await import("@/lib/supabase/server").then((m) => m.createClient());
    const {
      data: { user },
    } = await (anonClient?.auth.getUser() ?? { data: { user: null } });

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { data: paidOrder } = await supabase
      .from("orders")
      .select("id, report_id, metadata")
      .eq("owner_id", user.id)
      .eq("product_code", "FORTUNE_2026")
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!paidOrder) {
      return NextResponse.json(
        { error: "결제된 주문이 없습니다." },
        { status: 403 }
      );
    }

    const linkedReportId =
      paidOrder.report_id ||
      ((paidOrder.metadata as { reportId?: string } | null)?.reportId ?? null);
    if (linkedReportId) {
      return NextResponse.json({ reportId: linkedReportId });
    }

    const result = await buildFortuneReport({
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
        result,
      })
      .select("id")
      .single();

    if (report?.id) {
      await supabase
        .from("orders")
        .update({
          report_id: report.id,
          metadata: { ...((paidOrder.metadata as Record<string, unknown>) || {}), reportId: report.id },
        })
        .eq("id", paidOrder.id);
    }

    return NextResponse.json({ reportId: report?.id });
  }

  if (mode === "gift" && giftToken) {
    const { data: gift } = await supabase
      .from("gifts")
      .select("id")
      .eq("token", giftToken)
      .eq("gift_status", GIFT_STATUS.ACTIVE)
      .single();

    if (!gift) {
      return NextResponse.json(
        { error: "유효하지 않거나 이미 사용된 선물 링크입니다." },
        { status: 403 }
      );
    }

    const result = await buildFortuneReport({
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
        owner_id: null,
        gift_id: gift.id,
        input,
        result,
      })
      .select("id")
      .single();

    if (!report) {
      return NextResponse.json(
        { error: "운세 생성 실패" },
        { status: 500 }
      );
    }

    await supabase
      .from("gifts")
      .update({
        gift_status: GIFT_STATUS.USED,
        gift_opened_at: new Date().toISOString(),
        report_id: report.id,
      })
      .eq("id", gift.id);

    return NextResponse.json({ reportId: report.id });
  }

  return NextResponse.json(
    { error: "Invalid request" },
    { status: 400 }
  );
}
