"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const paymentKey = searchParams.get("paymentKey");
  const amount = searchParams.get("amount");

  const [status, setStatus] = useState<"loading" | "redirect" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId || !paymentKey || !amount) {
      setStatus("error");
      setError("결제 정보가 올바르지 않습니다.");
      return;
    }

    const confirm = async () => {
      const res = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount: parseInt(amount, 10),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setError(data.error || "결제 확인 실패");
        return;
      }

      if (data.reportId) {
        window.location.href = `/reports/${data.reportId}`;
        setStatus("redirect");
      } else if (data.giftToken) {
        window.location.href = `/products/2026-gift/sent?token=${encodeURIComponent(data.giftToken)}`;
        setStatus("redirect");
      } else {
        setStatus("error");
        setError("처리할 수 없는 응답입니다.");
      }
    };

    confirm();
  }, [orderId, paymentKey, amount]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-600">{error}</p>
        <Link href="/" className="text-zinc-600 hover:underline">
          홈으로
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <p className="text-zinc-600">결제 확인 중...</p>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">로딩 중...</div>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
