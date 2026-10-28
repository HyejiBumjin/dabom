"use client";

import { useEffect, useRef, useState } from "react";
import { requestPayment } from "@portone/browser-sdk/v2";
import { CheckoutLoginRequired, postCheckout, preparedCheckoutSchema } from "@/lib/portone/checkout-client";
import Link from "next/link";
import { POLICY_VERSION, checkoutNotices, merchant } from "@/lib/commerce/policy";

export function SajuCheckout({ profileId, paymentCustomerId, price, available, testMode = false }: { profileId: string; paymentCustomerId: string; price: number; available: boolean; testMode?: boolean }) {
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState("결제를 준비하는 중…");
  const paymentInFlight = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [terms, setTerms] = useState(false);
  const [digitalContent, setDigitalContent] = useState(false);
  useEffect(() => () => { activeRequest.current?.abort(); }, []);
  async function pay() {
    if (paymentInFlight.current || !available || !terms || !digitalContent) return;
    paymentInFlight.current = true;
    setPending(true); setError(null); setStep("결제를 준비하는 중…");
    const controller = new AbortController();
    activeRequest.current = controller;
    let navigating = false;
    try {
      const order = await postCheckout("prepare", { profileId, consent: { version: POLICY_VERSION, terms, digitalContent } }, preparedCheckoutSchema, controller.signal);
      if (controller.signal.aborted) return;
      // A full navigation avoids a stale prefetched checkout/report after payment.
      if (order.existing) { window.location.replace(`/saju/reports/${encodeURIComponent(order.reportId)}`); navigating = true; return; }
      const returnUrl = new URL("/saju/checkout/return", window.location.origin);
      returnUrl.searchParams.set("orderId", order.orderId);
      setStep("결제창에서 진행해줘…");
      const result = await requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!, channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        paymentId: order.orderId, orderName: order.orderName, totalAmount: order.amount, currency: "CURRENCY_KRW", payMethod: "CARD", redirectUrl: returnUrl.toString(),
        // KCP requires the registered merchant name for mobile card checkout.
        // The merchant-scoped identifier does not expose the Kakao account ID.
        bypass: { kcp_v2: { site_name: merchant.name, kcp_pay_title: "다봄", shop_user_id: paymentCustomerId } },
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
  return <div className="retro-checkout-action" aria-busy={pending}>
    <div className="commerce-checkout-notice"><p>결제 후 결과 화면에서 리포트를 생성해. 보통 수 분이 걸리며, 완료되면 내 운세함에서도 읽을 수 있어. 제공하지 못한 리포트와 중복 결제는 환불 대상이야.</p><p><Link href="/yearly#sample" target="_blank" rel="noopener">메시지 예시 (새 창)</Link> · <Link href="/refund" target="_blank" rel="noopener">환불 기준 (새 창)</Link> · <Link href="/privacy" target="_blank" rel="noopener">개인정보처리방침 (새 창)</Link></p></div>
    <fieldset className="commerce-consents" disabled={pending}>
      <legend>결제 전 확인</legend>
      <label><input type="checkbox" checked={terms} onChange={event => setTerms(event.target.checked)} /><span>[필수] {checkoutNotices.terms} <Link href="/terms" target="_blank" rel="noopener">약관 보기 (새 창)</Link></span></label>
      <label><input type="checkbox" checked={digitalContent} onChange={event => setDigitalContent(event.target.checked)} /><span>[필수] {checkoutNotices.digitalContent}</span></label>
    </fieldset>
    {testMode && <p className="retro-status-copy">테스트 결제 · 구매 내역은 테스트용으로 저장돼.</p>}
    {error && <p role="alert" className="retro-error">{error}</p>}
    {available && (!terms || !digitalContent) && <p className="commerce-muted">위 두 항목을 확인하면 결제할 수 있어.</p>}
    <button type="button" className="retro-button" disabled={!available || pending || !terms || !digitalContent} onClick={() => void pay()}>{pending ? step : available ? `${price.toLocaleString()}원 · ${testMode ? "결제 테스트" : "올해 운세 받기"}` : "지금은 결제를 준비 중이야"}</button>
  </div>;
}
