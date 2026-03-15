import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateGiftToken } from "@/lib/token";
import { AMOUNT_3900, GIFT_STATUS, ORDER_STATUS, PRODUCTS } from "@/lib/constants";
import { env } from "@/lib/env";

const prepareSchema = z.object({
  productCode: z.enum([PRODUCTS.FORTUNE_2026, PRODUCTS.GIFT_FORTUNE_2026]),
  amount: z.literal(AMOUNT_3900),
  input: z
    .object({
      birthDate: z.string().min(1),
      birthTime: z.string().min(1).optional(),
      gender: z.string().min(1).optional(),
      name: z.string().trim().min(1).max(100).optional(),
      relationship: z.string().trim().min(1).max(50).optional(),
      calendarType: z.enum(["solar", "lunar"]).optional(),
      leapMonthType: z.enum(["regular", "leap"]).optional(),
    })
    .optional(),
  receiverName: z.string().trim().max(100).optional(),
});

function generateOrderId(): string {
  return `ord_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(request: Request) {
  if (!env.NEXT_PUBLIC_PORTONE_STORE_ID || !env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || !env.PORTONE_API_SECRET) {
    return NextResponse.json({ error: "PortOne not configured" }, { status: 503 });
  }

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
  const parsed = prepareSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const { productCode, amount, input, receiverName } = parsed.data;
  if (productCode === PRODUCTS.FORTUNE_2026) {
    if (!input?.birthDate) {
      return NextResponse.json({ error: "생년월일이 필요합니다." }, { status: 400 });
    }
    if (!input?.name) {
      return NextResponse.json({ error: "이름이 필요합니다." }, { status: 400 });
    }
    if (!input?.relationship) {
      return NextResponse.json({ error: "관계가 필요합니다." }, { status: 400 });
    }
    if (!input?.calendarType) {
      return NextResponse.json({ error: "양력/음력 정보가 필요합니다." }, { status: 400 });
    }
    if (!input?.leapMonthType) {
      return NextResponse.json({ error: "평달/윤달 정보가 필요합니다." }, { status: 400 });
    }
  }

  const orderId = generateOrderId();
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
        gift_status: GIFT_STATUS.CREATED,
      })
      .select("id")
      .single();

    if (giftErr || !gift) {
      const message = giftErr?.message || "Failed to create gift";
      return NextResponse.json({ error: message }, { status: 500 });
    }
    giftId = gift.id;
  }

  const { error: orderErr } = await supabase.from("orders").insert({
    owner_id: user.id,
    product_code: productCode,
    order_id: orderId,
    amount,
    status: ORDER_STATUS.PENDING,
    gift_id: giftId,
    metadata: { input: input || null },
  });

  if (orderErr) {
    return NextResponse.json({ error: orderErr.message || "Failed to create order" }, { status: 500 });
  }

  return NextResponse.json({
    order_id: orderId,
    amount,
    product_name: productCode === PRODUCTS.FORTUNE_2026 ? "2026년 운세 (본인용)" : "2026년 운세 선물하기",
    buyer: {
      user_id: user.id,
      email: user.email || null,
      phone: user.phone || null,
    },
    gift_token: giftToken ?? undefined,
  });
}
