import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateGiftToken } from "@/lib/token";
import { PRODUCTS, AMOUNT_3900, ORDER_STATUS, GIFT_STATUS } from "@/lib/constants";
import { env } from "@/lib/env";

const TOSS_ORDER_PREFIX = "dabom_";

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
  const { productCode, amount, input, receiverName } = body;

  if (productCode !== PRODUCTS.FORTUNE_2026 && productCode !== PRODUCTS.GIFT_FORTUNE_2026) {
    return NextResponse.json(
      { error: "Invalid product" },
      { status: 400 }
    );
  }

  if (amount !== AMOUNT_3900) {
    return NextResponse.json(
      { error: "Invalid amount" },
      { status: 400 }
    );
  }

  const tossOrderId = `${TOSS_ORDER_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  let giftId: string | null = null;
  let giftToken: string | null = null;

  if (productCode === PRODUCTS.GIFT_FORTUNE_2026) {
    giftToken = generateGiftToken();
    const { data: gift, error: giftErr } = await supabase
      .from("gifts")
      .insert({
        token: giftToken,
        buyer_id: user.id,
        receiver_name: receiverName || null,
        status: GIFT_STATUS.CREATED,
      })
      .select("id")
      .single();

    if (giftErr || !gift) {
      return NextResponse.json(
        { error: "Failed to create gift" },
        { status: 500 }
      );
    }
    giftId = gift.id;
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      owner_id: user.id,
      product_code: productCode,
      toss_order_id: tossOrderId,
      amount,
      status: ORDER_STATUS.PENDING,
      gift_id: giftId,
      metadata: { input: input || null },
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    orderId: tossOrderId,
    amount,
    orderDbId: order.id,
    giftToken: giftToken ?? undefined,
  });
}
