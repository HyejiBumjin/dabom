"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { requestPayment } from "@portone/browser-sdk/v2";

export function SajuCheckout({ profileId, price, available }: { profileId: string; price: number; available: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const paymentInFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  async function pay() {
    if (paymentInFlight.current || !available) return;
    paymentInFlight.current = true;
    setPending(true); setError(null);
    let navigating = false;
    try {
      const response = await fetch("/api/saju/payments/prepare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId }) });
      const order = await response.json();
      if (response.status === 401) { router.push(`/login?next=${encodeURIComponent(`/saju/profiles/${profileId}/checkout`)}`); navigating = true; return; }
      if (!response.ok) throw new Error(order.error);
      if (order.existing) { router.replace(`/saju/reports/${order.reportId}`); navigating = true; return; }
      const returnUrl = new URL("/saju/checkout/return", window.location.origin);
      returnUrl.searchParams.set("orderId", order.orderId);
      const result = await requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!, channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        paymentId: order.orderId, orderName: order.orderName, totalAmount: order.amount, currency: "CURRENCY_KRW", payMethod: "CARD", redirectUrl: returnUrl.toString(),
      });
      if (!result) return;
      if ("code" in result && result.code) throw new Error("결제가 완료되지 않았어. 원할 때 다시 시도해줘.");
      returnUrl.searchParams.set("paymentId", result.paymentId);
      router.replace(`${returnUrl.pathname}${returnUrl.search}`);
      navigating = true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "결제를 준비하지 못했어."); }
    finally {
      if (!navigating) { paymentInFlight.current = false; setPending(false); }
    }
  }
  return <div className="retro-checkout-action" aria-busy={pending}>{error && <p role="alert" className="retro-error">{error}</p>}<button type="button" className="retro-button" disabled={!available || pending} onClick={() => void pay()}>{pending ? "구매한 운세를 확인하는 중…" : available ? `${price.toLocaleString()}원 · 올해 운세 받기` : "지금은 결제를 준비 중이야"}</button></div>;
}
