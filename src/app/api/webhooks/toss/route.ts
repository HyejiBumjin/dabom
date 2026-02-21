import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ORDER_STATUS } from "@/lib/constants";
import { env } from "@/lib/env";

// TODO: Add strict signature verification per Toss docs
// Optional: check TOSS_WEBHOOK_SECRET header

export async function POST(request: Request) {
  const supabase = await createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({}, { status: 503 });
  }

  if (env.TOSS_WEBHOOK_SECRET) {
    const secret = request.headers.get("x-toss-webhook-secret") || request.headers.get("authorization");
    if (secret !== env.TOSS_WEBHOOK_SECRET) {
      return NextResponse.json({}, { status: 401 });
    }
  }

  const body = await request.json();
  const { eventType, data } = body;

  if (eventType !== "PAYMENT_STATUS_CHANGED" || !data?.orderId || !data?.status) {
    return NextResponse.json({ received: true });
  }

  const { orderId, status } = data;

  if (status !== "DONE") {
    return NextResponse.json({ received: true });
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("toss_order_id", orderId)
    .single();

  if (!order || order.status === ORDER_STATUS.PAID) {
    return NextResponse.json({ received: true });
  }

  await supabase
    .from("orders")
    .update({
      status: ORDER_STATUS.PAID,
      payment_key: data.paymentKey || null,
    })
    .eq("id", order.id);

  return NextResponse.json({ received: true });
}
