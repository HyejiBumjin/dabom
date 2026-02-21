"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TossCheckoutWidget } from "./TossCheckoutWidget";
import { runtimeConfig } from "@/lib/runtime-config";

export function GiftPurchaseForm() {
  const [receiverName, setReceiverName] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode: "GIFT_FORTUNE_2026",
          amount: 3900,
          receiverName: receiverName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "주문 생성 실패");
        return;
      }
      setOrderId(data.orderId);
    } catch {
      setError("주문 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!runtimeConfig.tossReady) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-zinc-500">
          Toss Payments가 설정되지 않았습니다.
        </CardContent>
      </Card>
    );
  }

  if (orderId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>결제</CardTitle>
        </CardHeader>
        <CardContent>
          <TossCheckoutWidget
            orderId={orderId}
            amount={3900}
            orderName="2026년 운세 선물하기"
            onReady={() => {}}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>2026년 운세 선물하기</CardTitle>
        <p className="text-sm text-zinc-500">3,900원</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="receiverName">받는 사람 이름 (선택)</Label>
          <Input
            id="receiverName"
            placeholder="선물받는 분 이름"
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button
          onClick={createOrder}
          disabled={loading}
          className="w-full"
        >
          {loading ? "처리 중..." : "결제 진행하기"}
        </Button>
      </CardContent>
    </Card>
  );
}
