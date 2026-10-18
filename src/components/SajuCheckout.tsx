"use client";

import { useEffect, useRef, useState } from "react";
import { requestPayment } from "@portone/browser-sdk/v2";
import { CheckoutLoginRequired, postCheckout, preparedCheckoutSchema } from "@/lib/portone/checkout-client";

export function SajuCheckout({ profileId, price, available, testMode = false }: { profileId: string; price: number; available: boolean; testMode?: boolean }) {
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState("결제를 준비하는 중…");
  const paymentInFlight = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => () => { activeRequest.current?.abort(); }, []);
  async function pay() {
    if (paymentInFlight.current || !available) return;
    paymentInFlight.current = true;
    setPending(true); setError(null); setStep("결제를 준비하는 중…");
    const controller = new AbortController();
    activeRequest.current = controller;
    let navigating = false;
    try {
      const order = await postCheckout("prepare", { profileId }, preparedCheckoutSchema, controller.signal);
      if (controller.signal.aborted) return;
      // A full navigation avoids a stale prefetched checkout/report after payment.
      if (order.existing) { window.location.replace(`/saju/reports/${encodeURIComponent(order.reportId)}`); navigating = true; return; }
      const returnUrl = new URL("/saju/checkout/return", window.location.origin);
      returnUrl.searchParams.set("orderId", order.orderId);
      setStep("결제창에서 진행해줘…");
      const result = await requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!, channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        paymentId: order.orderId, orderName: order.orderName, totalAmount: order.amount, currency: "CURRENCY_KRW", payMethod: "CARD", redirectUrl: returnUrl.toString(),
      });
      if (controller.signal.aborted) return;
      if (!result) return;
      if ("code" in result && result.code) throw new Error("결제가 완료되지 않았어. 원할 때 다시 시도해줘.");
      if (result.paymentId !== order.orderId) throw new Error("결제 번호를 확인하지 못했어. 내 운세함에서 확인해줘.");
      returnUrl.searchParams.set("paymentId", result.paymentId);
      setStep("결제 내역을 확인하는 중…");
      window.location.replace(`${returnUrl.pathname}${returnUrl.search}`);
      navigating = true;
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (cause instanceof CheckoutLoginRequired) {
        window.location.replace(`/login?next=${encodeURIComponent(`/saju/profiles/${encodeURIComponent(profileId)}/checkout`)}`);
        navigating = true;
        return;
      }
      setError(cause instanceof Error ? cause.message : "결제를 준비하지 못했어.");
    }
    finally {
      if (activeRequest.current === controller) activeRequest.current = null;
      if (!navigating && !controller.signal.aborted) { paymentInFlight.current = false; setPending(false); }
    }
  }
  return <div className="retro-checkout-action" aria-busy={pending}>{testMode && <p className="retro-status-copy">테스트 결제 · 구매 내역은 테스트용으로 저장돼.</p>}{error && <p role="alert" className="retro-error">{error}</p>}<button type="button" className="retro-button" disabled={!available || pending} onClick={() => void pay()}>{pending ? step : available ? `${price.toLocaleString()}원 · ${testMode ? "결제 테스트" : "올해 운세 받기"}` : "지금은 결제를 준비 중이야"}</button></div>;
}
