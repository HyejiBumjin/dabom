"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { DateSelect } from "@/components/ui/date-select";
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
    if (!birthTime) {
      setError("출생시간을 선택해 주세요.");
      return;
    }
    if (!gender) {
      setError("성별을 선택해 주세요.");
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
        <DateSelect
          id="birthDate"
          label="생년월일 *"
          value={birthDate}
          onChange={setBirthDate}
          required
        />
        <div>
          <Label htmlFor="birthTime">출생시간 *</Label>
          <CustomSelect
            id="birthTime"
            value={birthTime}
            onChange={setBirthTime}
            placeholder="선택"
            required
            options={[
              { value: "모름", label: "모름" },
              { value: "23:00", label: "자시 (23:00~01:00)" },
              { value: "01:00", label: "축시 (01:00~03:00)" },
              { value: "03:00", label: "인시 (03:00~05:00)" },
              { value: "05:00", label: "묘시 (05:00~07:00)" },
              { value: "07:00", label: "진시 (07:00~09:00)" },
              { value: "09:00", label: "사시 (09:00~11:00)" },
              { value: "11:00", label: "오시 (11:00~13:00)" },
              { value: "13:00", label: "미시 (13:00~15:00)" },
              { value: "15:00", label: "신시 (15:00~17:00)" },
              { value: "17:00", label: "유시 (17:00~19:00)" },
              { value: "19:00", label: "술시 (19:00~21:00)" },
              { value: "21:00", label: "해시 (21:00~23:00)" },
            ]}
          />
        </div>
        <div>
          <Label htmlFor="gender">성별 *</Label>
          <CustomSelect
            id="gender"
            value={gender}
            onChange={setGender}
            placeholder="선택"
            required
            options={[
              { value: "M", label: "남성" },
              { value: "F", label: "여성" },
            ]}
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
