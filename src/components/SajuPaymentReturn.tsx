"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PixelEnvelope } from "@/components/RetroWindow";
import { CheckoutLoginRequired, confirmedCheckoutSchema, postCheckout } from "@/lib/portone/checkout-client";

export function SajuPaymentReturn({ orderId, paymentId }: { orderId: string; paymentId: string }) {
  const requestInFlight = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    if (requestInFlight.current) return;
    requestInFlight.current = true; setError(null);
    const controller = new AbortController();
    activeRequest.current = controller;
    let navigating = false;
    try {
      if (!orderId || !paymentId || orderId !== paymentId) throw new Error("결제 번호를 확인하지 못했어. 내 운세함에서 구매한 운세를 확인해줘.");
      const result = await postCheckout("confirm", { orderId, paymentId }, confirmedCheckoutSchema, controller.signal);
      if (controller.signal.aborted) return;
      window.location.replace(`/saju/reports/${encodeURIComponent(result.reportId)}`);
      navigating = true;
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (cause instanceof CheckoutLoginRequired) {
        window.location.replace(`/login?next=${encodeURIComponent(`/saju/checkout/return?orderId=${encodeURIComponent(orderId)}&paymentId=${encodeURIComponent(paymentId)}`)}`);
        navigating = true;
        return;
      }
      setError(cause instanceof Error ? cause.message : "결제 확인을 다시 눌러줘.");
    }
    finally {
      if (activeRequest.current === controller) { activeRequest.current = null; if (!navigating) requestInFlight.current = false; }
    }
  }
  useEffect(() => {
    const timer = setTimeout(() => { void confirm(); }, 0);
    return () => { clearTimeout(timer); activeRequest.current?.abort(); activeRequest.current = null; requestInFlight.current = false; };
    // The confirmation is idempotent on the server; remounts reuse the purchase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, paymentId]);
  if (!error) return <section className="retro-status" aria-busy="true"><PixelEnvelope /><h1 className="retro-heading">결제 내역을<br />확인하고 있어.</h1><p className="retro-status-copy" role="status">결제가 확인되면 올해 운세로 이어줄게.</p><Link className="retro-back-link" href="/saju/library">내 운세함으로</Link></section>;
  return <section className="retro-status"><h1 className="retro-heading">결제 확인을 이어갈게.</h1><p className="retro-status-copy" role="alert">{error}</p><button type="button" className="retro-button" onClick={() => void confirm()}>결제 확인 다시 하기</button><p className="retro-status-copy">다시 확인해도 추가로 결제되지 않아.</p><Link className="retro-back-link" href="/saju/library">내 운세함으로</Link></section>;
}
