"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ReportPreparing } from "@/components/RetroWindow";

export function SajuPaymentReturn({ orderId, paymentId }: { orderId: string; paymentId: string }) {
  const router = useRouter();
  const requestInFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    if (requestInFlight.current) return;
    requestInFlight.current = true; setError(null);
    try {
      const response = await fetch("/api/saju/payments/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, paymentId }) });
      const result = await response.json();
      if (response.status === 401) { router.replace(`/login?next=${encodeURIComponent(`/saju/checkout/return?orderId=${encodeURIComponent(orderId)}&paymentId=${encodeURIComponent(paymentId)}`)}`); return; }
      if (!response.ok) throw new Error(result.error);
      router.replace(`/saju/reports/${result.reportId}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "결제 확인을 다시 눌러줘."); }
    finally { requestInFlight.current = false; }
  }
  useEffect(() => {
    const timer = setTimeout(() => { void confirm(); }, 0);
    return () => clearTimeout(timer);
    // The confirmation is idempotent on the server; remounts reuse the purchase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, paymentId]);
  if (!error) return <ReportPreparing />;
  return <section className="retro-status"><h1 className="retro-heading">결제 확인을 이어갈게.</h1><p className="retro-status-copy" role="alert">{error}</p><button className="retro-button" onClick={() => void confirm()}>결제 확인 다시 하기</button><Link className="retro-back-link" href="/saju/library">내 운세함으로</Link></section>;
}
