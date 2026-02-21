import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { confirmTossPayment } from "@/lib/toss/server";
import { generateFortune } from "@/lib/fortune/engine";
import { ORDER_STATUS, GIFT_STATUS, PRODUCTS } from "@/lib/constants";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  const supabase = await createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

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

  const body = await request.json();
  const { paymentKey, orderId, amount } = body;

  if (!paymentKey || !orderId || typeof amount !== "number") {
    return NextResponse.json(
      { error: "Invalid parameters" },
      { status: 400 }
    );
  }

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("toss_order_id", orderId)
    .eq("owner_id", user.id)
    .single();

  if (!order) {
    return NextResponse.json(
      { error: "주문을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (order.status === ORDER_STATUS.PAID) {
    // Idempotent: already paid
    if (order.product_code === PRODUCTS.FORTUNE_2026) {
      const { data: report } = await supabase
        .from("fortune_reports")
        .select("id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return NextResponse.json({
        ok: true,
        reportId: report?.id,
        alreadyPaid: true,
      });
    }
    if (order.product_code === PRODUCTS.GIFT_FORTUNE_2026 && order.gift_id) {
      const { data: gift } = await supabase
        .from("gifts")
        .select("token")
        .eq("id", order.gift_id)
        .single();
      return NextResponse.json({
        ok: true,
        giftToken: gift?.token,
        alreadyPaid: true,
      });
    }
  }

  if (order.amount !== amount) {
    return NextResponse.json(
      { error: "Amount mismatch" },
      { status: 400 }
    );
  }

  const result = await confirmTossPayment({
    paymentKey,
    orderId,
    amount,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    );
  }

  await supabase
    .from("orders")
    .update({
      status: ORDER_STATUS.PAID,
      payment_key: result.data.paymentKey,
    })
    .eq("id", order.id);

  if (order.product_code === PRODUCTS.FORTUNE_2026) {
    const input = (order.metadata as { input?: { birthDate: string; birthTime?: string; gender?: string } })?.input;
    if (!input?.birthDate) {
      return NextResponse.json(
        { error: "Input missing" },
        { status: 400 }
      );
    }
    const fortuneResult = generateFortune({
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      gender: input.gender,
    });
    const { data: report } = await supabase
      .from("fortune_reports")
      .insert({
        owner_id: user.id,
        input: input,
        result: fortuneResult,
      })
      .select("id")
      .single();

    return NextResponse.json({
      ok: true,
      reportId: report?.id,
    });
  }

  if (order.product_code === PRODUCTS.GIFT_FORTUNE_2026 && order.gift_id) {
    await supabase
      .from("gifts")
      .update({ status: GIFT_STATUS.ACTIVE })
      .eq("id", order.gift_id);

    const { data: gift } = await supabase
      .from("gifts")
      .select("token")
      .eq("id", order.gift_id)
      .single();

    return NextResponse.json({
      ok: true,
      giftToken: gift?.token,
    });
  }

  return NextResponse.json({ ok: true });
}
