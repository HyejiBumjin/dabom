"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TossCheckoutWidget } from "./TossCheckoutWidget";
import { runtimeConfig } from "@/lib/runtime-config";

export function SelfPurchaseForm({ preview }: { preview?: boolean } = {}) {
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderDbId, setOrderDbId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrder = async () => {
    if (preview) return;
    if (!birthDate) {
      setError("생년월일을 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode: "FORTUNE_2026",
          amount: 3900,
          input: {
            birthDate,
            birthTime: birthTime || undefined,
            gender: gender || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "주문 생성 실패");
        return;
      }
      setOrderId(data.orderId);
      setOrderDbId(data.orderDbId);
    } catch {
      setError("주문 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!preview && !runtimeConfig.tossReady) {
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
            orderName="2026년 운세 (본인용)"
            onReady={() => {}}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>2026년 운세 (본인용)</CardTitle>
        <p className="text-sm text-zinc-500">3,900원</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="birthDate">생년월일 *</Label>
          <Input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="birthTime">출생시간 (선택)</Label>
          <Input
            id="birthTime"
            type="time"
            placeholder="모름"
            value={birthTime}
            onChange={(e) => setBirthTime(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="gender">성별 (선택)</Label>
          <Select
            id="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">선택</option>
            <option value="M">남성</option>
            <option value="F">여성</option>
          </Select>
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
