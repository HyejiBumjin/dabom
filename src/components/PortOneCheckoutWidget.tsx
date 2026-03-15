"use client";

import { requestPayment } from "@portone/browser-sdk/v2";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

interface PortOneCheckoutWidgetProps {
  orderId: string;
  amount: number;
  orderName: string;
  buyerEmail?: string;
  buyerTel?: string;
  buyerName?: string;
  disabled?: boolean;
}

export function PortOneCheckoutWidget({
  orderId,
  amount,
  orderName,
  buyerEmail,
  buyerTel,
  buyerName,
  disabled,
}: PortOneCheckoutWidgetProps) {
  const [error, setError] = useState<string | null>(null);
  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID || "";
  const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || "";

  const onPay = useCallback(async () => {
    try {
      const result = await requestPayment({
        storeId,
        channelKey,
        paymentId: orderId,
        orderName,
        totalAmount: amount,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
        customer: {
          fullName: buyerName,
          email: buyerEmail,
          phoneNumber: buyerTel,
        },
      });

      if (result && "code" in result) {
        const params = new URLSearchParams({
          order_id: orderId,
          status: "failed",
          code: String(result.code ?? ""),
          message: result.message || "결제 실패",
        });
        window.location.href = `/checkout/fail?${params.toString()}`;
        return;
      }

      const paymentId = result?.paymentId || orderId;
      window.location.href = `/checkout/success?order_id=${encodeURIComponent(orderId)}&payment_id=${encodeURIComponent(paymentId)}`;
    } catch {
      setError("결제창 호출 중 오류가 발생했습니다.");
    }
  }, [amount, buyerEmail, buyerName, buyerTel, channelKey, orderId, orderName, storeId]);

  if (!storeId || !channelKey) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
        PortOne V2 설정(storeId/channelKey)을 확인해 주세요.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button onClick={onPay} disabled={disabled || !orderId || !amount} className="w-full">
        {amount.toLocaleString()}원 결제하기
      </Button>
    </div>
  );
}
