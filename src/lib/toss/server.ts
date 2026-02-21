import { env } from "../env";
import type { TossConfirmRequest, TossConfirmResponse } from "./types";

const TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";

export async function confirmTossPayment(
  params: TossConfirmRequest
): Promise<{ success: true; data: TossConfirmResponse } | { success: false; error: string }> {
  if (!env.TOSS_SECRET_KEY) {
    return { success: false, error: "Toss not configured" };
  }

  try {
    const res = await fetch(TOSS_CONFIRM_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(env.TOSS_SECRET_KEY + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey: params.paymentKey,
        orderId: params.orderId,
        amount: params.amount,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.message || data.code || "결제 확인 실패",
      };
    }

    // Card-only: reject non-card
    const method = (data.method as string) || "";
    if (method !== "카드" && method.toLowerCase() !== "card") {
      return {
        success: false,
        error: "카드 결제만 지원됩니다.",
      };
    }

    return { success: true, data: data as TossConfirmResponse };
  } catch (e) {
    const err = e instanceof Error ? e.message : "결제 확인 중 오류";
    return { success: false, error: err };
  }
}
