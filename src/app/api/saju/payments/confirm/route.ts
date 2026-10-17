import { NextResponse } from "next/server";
import { z } from "zod";
import { firebaseStore } from "@/lib/firebase/store";
import { getSajuAccount } from "@/lib/saju/account";
import { ensureSajuReport, fulfillSajuOrder } from "@/lib/saju/library-service";
import { getPortOnePayment } from "@/lib/portone/server";
import { SAJU_PRODUCT_CODE } from "@/lib/saju/profile-input";
import { guardedMutation, readJsonBody } from "@/lib/security/request";
import { enforceAccountRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  return guardedMutation(request, async () => {
  const account = await getSajuAccount();
  if (!account) return NextResponse.json({ error: "로그인이 필요해." }, { status: 401 });
  await enforceAccountRateLimit(account.id, "payment-confirm", 30, 600_000);
  const parsed = z.object({ orderId: z.string().min(1).max(80), paymentId: z.string().min(1).max(80) }).safeParse(await readJsonBody(request));
  if (!parsed.success || parsed.data.paymentId !== parsed.data.orderId) return NextResponse.json({ error: "결제 정보를 확인해줘." }, { status: 400 });
  const order = await firebaseStore.getOrder(parsed.data.orderId);
  if (!order || order.userId !== account.id || order.productCode !== SAJU_PRODUCT_CODE || (await firebaseStore.getProfile(order.sajuProfileId))?.userId !== account.id) return NextResponse.json({ error: "주문을 찾지 못했어." }, { status: 404 });
  try {
    if (order.status === "PAID") {
      const report = await ensureSajuReport(account.id, order.sajuProfileId, order.id);
      return NextResponse.json({ reportId: report.id, existing: true });
    }
    // Only the provider's server response can grant access; never trust client status/amount.
    const payment = await getPortOnePayment(order.merchantUid);
    const report = await fulfillSajuOrder(account.id, order.merchantUid, payment);
    return NextResponse.json({ reportId: report.id });
  } catch {
    return NextResponse.json({ error: "결제 완료를 아직 확인하지 못했어. 결제 확인을 다시 눌러줘." }, { status: 409 });
  }
  });
}
