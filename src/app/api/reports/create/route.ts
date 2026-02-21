import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateFortune } from "@/lib/fortune/engine";
import { GIFT_STATUS } from "@/lib/constants";

export async function POST(request: Request) {
  const supabase = await createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { mode, giftToken, input } = body;

  if (!input?.birthDate) {
    return NextResponse.json(
      { error: "생년월일이 필요합니다." },
      { status: 400 }
    );
  }

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
      .select("id")
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

    const result = generateFortune({
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      gender: input.gender,
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

    return NextResponse.json({ reportId: report?.id });
  }

  if (mode === "gift" && giftToken) {
    const { data: gift } = await supabase
      .from("gifts")
      .select("id")
      .eq("token", giftToken)
      .eq("status", GIFT_STATUS.ACTIVE)
      .single();

    if (!gift) {
      return NextResponse.json(
        { error: "유효하지 않거나 이미 사용된 선물 링크입니다." },
        { status: 403 }
      );
    }

    const result = generateFortune({
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      gender: input.gender,
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
      .update({ status: GIFT_STATUS.USED, used_at: new Date().toISOString(), report_id: report.id })
      .eq("id", gift.id);

    return NextResponse.json({ reportId: report.id });
  }

  return NextResponse.json(
    { error: "Invalid request" },
    { status: 400 }
  );
}
