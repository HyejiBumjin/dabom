"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { BackToHomeLink } from "@/components/BackToHomeLink";

function CheckoutFailContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || searchParams.get("merchant_uid");
  const paymentId = searchParams.get("payment_id") || searchParams.get("imp_uid");
  const status = searchParams.get("status");
  const code = searchParams.get("code");
  const message = searchParams.get("message");

  useEffect(() => {
    if (!orderId) return;
    fetch("/api/payments/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        payment_id: paymentId || undefined,
        payment_status: status === "canceled" ? "canceled" : "failed",
      }),
    }).catch(() => {});
  }, [orderId, paymentId, status]);

  return (
    <div className="text-center sm:text-left space-y-6">
      <h1 className="text-4xl font-bold text-zinc-900 mb-4">결제 실패</h1>
      <p className="text-zinc-600">
        결제 처리 중 문제가 발생했습니다.
      </p>
      {code && <p className="text-sm text-zinc-600">코드: {code}</p>}
      {message && <p className="text-sm text-zinc-600">{decodeURIComponent(message)}</p>}
      <BackToHomeLink className="block" />
    </div>
  );
}

export default function CheckoutFailPage() {
  return (
    <Suspense fallback={<div className="text-center text-zinc-600 py-12">로딩 중...</div>}>
      <CheckoutFailContent />
    </Suspense>
  );
}
