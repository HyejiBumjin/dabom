import { Webhook } from "@portone/server-sdk";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { getPortOnePayment } from "@/lib/portone/server";
import { fulfillSajuOrder, PAYMENT_TRANSACTION_OPTIONS } from "@/lib/saju/library-service";
import { SAJU_PRODUCT_CODE } from "@/lib/saju/profile-input";
import { privateJson, readRequestText, RequestSecurityError } from "@/lib/security/request";

/** Provider webhook is signed instead of using browser-cookie authentication. */
export async function POST(request: Request) {
  if (!env.PORTONE_WEBHOOK_SECRET || !env.NEXT_PUBLIC_PORTONE_STORE_ID || !env.PORTONE_API_SECRET) return privateJson({ error: "결제 알림이 설정되지 않았어." }, 503);
  let webhook: Awaited<ReturnType<typeof Webhook.verify>>;
  try {
    const raw = await readRequestText(request, 65536);
    webhook = await Webhook.verify(env.PORTONE_WEBHOOK_SECRET, raw, Object.fromEntries(request.headers));
  } catch (error) {
    return privateJson({ error: "유효하지 않은 결제 알림이야." }, error instanceof RequestSecurityError ? error.status : 400);
  }
  if (typeof webhook.type !== "string" || !webhook.type.startsWith("Transaction.") || !("data" in webhook) || !("paymentId" in webhook.data)) return privateJson({ ok: true });
  if (webhook.data.storeId !== env.NEXT_PUBLIC_PORTONE_STORE_ID) return privateJson({ error: "상점이 일치하지 않아." }, 400);
  const paymentId = webhook.data.paymentId;
  if (!paymentId || paymentId.length > 80) return privateJson({ error: "결제 번호를 확인해줘." }, 400);
  try {
    const order = await prisma.order.findFirst({ where: { merchantUid: paymentId, product: { code: SAJU_PRODUCT_CODE } }, select: { userId: true } });
    if (!order) return privateJson({ ok: true });
    // Ignore event claims and re-read the provider's current state. Delayed/replayed
    // Paid events cannot restore a cancelled order.
    const payment = await getPortOnePayment(paymentId);
    if (payment.status === "PAID") await prisma.$transaction(tx => fulfillSajuOrder(order.userId, paymentId, payment, tx), PAYMENT_TRANSACTION_OPTIONS);
    else if (["CANCELLED", "PARTIAL_CANCELLED"].includes(payment.status)) {
      await prisma.order.updateMany({ where: { merchantUid: paymentId, userId: order.userId }, data: { status: "CANCELLED" } });
    }
    return privateJson({ ok: true });
  } catch {
    // Non-2xx allows the provider to retry an interrupted database/API operation.
    return privateJson({ error: "결제 상태를 확인하지 못했어." }, 503);
  }
}
