import { NextResponse } from "next/server";
import { z } from "zod";
import { getSajuAccount } from "@/lib/saju/account";
import { prepareSajuOrder, fulfillSajuOrder } from "@/lib/saju/library-service";
import { env } from "@/lib/env";
import { getPortOnePayment, PortOnePaymentLookupError } from "@/lib/portone/server";
import { guardedMutation, readJsonBody, RequestSecurityError } from "@/lib/security/request";
import { enforceAccountRateLimit } from "@/lib/security/rate-limit";
import { isCommerceReady, YEARLY_PRICE } from "@/lib/commerce/policy";
import { isPaymentTestMode } from "@/lib/portone/payment-mode";

export async function POST(request: Request) {
  return guardedMutation(request, async () => {
  const account = await getSajuAccount();
  if (!account) return NextResponse.json({ error: "로그인이 필요해." }, { status: 401 });
  await enforceAccountRateLimit(account.id, "payment-prepare", 30, 600_000);
  const parsed = z.object({ profileId: z.string().min(1).max(80), consent: z.unknown().optional() }).safeParse(await readJsonBody(request));
  if (!parsed.success) return NextResponse.json({ error: "사주 정보를 확인해줘." }, { status: 400 });
  try {
    const result = await prepareSajuOrder(account.id, parsed.data.profileId, undefined, parsed.data.consent);
    // A purchased result opens even if checkout is temporarily unavailable.
    if (result.existing) return NextResponse.json(result);
    if (!env.NEXT_PUBLIC_PORTONE_STORE_ID || !env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || !env.PORTONE_API_SECRET || !env.PORTONE_WEBHOOK_SECRET) return NextResponse.json({ error: "지금은 결제를 준비 중이야. 잠시 뒤에 다시 와줘." }, { status: 503 });
    // Recover a verified payment even if the customer closed the return page.
    try {
      const payment = await getPortOnePayment(result.orderId);
      if (payment.status === "PAID") {
        const report = await fulfillSajuOrder(account.id, result.orderId, payment);
        return NextResponse.json({ existing: true, reportId: report.id });
      }
      if (!["READY", "FAILED"].includes(payment.status)) return NextResponse.json({ error: "이 주문의 결제 상태를 확인 중이야. 결제 확인을 이어가줘." }, { status: 409 });
    } catch (error) {
      if (!(error instanceof PortOnePaymentLookupError && error.status === 404)) throw error;
    }
    if (!isPaymentTestMode() && !isCommerceReady()) return NextResponse.json({ error: "정식 판매를 준비 중이야. 판매 안내가 확정되면 결제를 열게." }, { status: 503 });
    if (result.amount !== YEARLY_PRICE) return NextResponse.json({ error: "상품 금액을 확인 중이야. 잠시 뒤 다시 확인해줘." }, { status: 409 });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RequestSecurityError) throw error;
    if (error instanceof Error && error.message === "PROFILE_NOT_FOUND") return NextResponse.json({ error: "사주 정보를 찾지 못했어." }, { status: 404 });
    if (error instanceof Error && error.message === "CHECKOUT_CONSENT_REQUIRED") return NextResponse.json({ error: "결제 전 약관과 디지털콘텐츠 안내를 다시 확인하고 동의해줘." }, { status: 400 });
    return NextResponse.json({ error: "결제를 준비하지 못했어. 다시 시도해줘." }, { status: 503 });
  }
  });
}
