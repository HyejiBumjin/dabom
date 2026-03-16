"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { DateSelect } from "@/components/ui/date-select";
import { InterestSelector } from "./InterestSelector";
import { PortOneCheckoutWidget } from "./PortOneCheckoutWidget";
import { runtimeConfig } from "@/lib/runtime-config";

export function SelfPurchaseForm({ preview }: { preview?: boolean } = {}) {
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState("");
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [calendarType, setCalendarType] = useState("");
  const [leapMonthType, setLeapMonthType] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [buyerEmail, setBuyerEmail] = useState<string | undefined>(undefined);
  const [buyerPhone, setBuyerPhone] = useState<string | undefined>(undefined);
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
    if (!name.trim()) {
      setError("이름을 입력해 주세요.");
      return;
    }
    if (!relationship) {
      setError("관계를 선택해 주세요.");
      return;
    }
    if (!calendarType) {
      setError("양력/음력을 선택해 주세요.");
      return;
    }
    if (!leapMonthType) {
      setError("평달/윤달을 선택해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode: "FORTUNE_2026",
          amount: 3900,
          input: {
            birthDate,
            birthTime: birthTime || undefined,
            gender: gender || undefined,
            name: name.trim(),
            relationship,
            calendarType,
            leapMonthType,
            interests: interests.length > 0 ? interests : undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "주문 생성 실패");
        return;
      }
      setOrderId(data.order_id);
      setBuyerEmail(data.buyer?.email ?? undefined);
      setBuyerPhone(data.buyer?.phone ?? undefined);
    } catch {
      setError("주문 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (orderId) {
    if (runtimeConfig.portoneReady) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>결제</CardTitle>
          </CardHeader>
          <CardContent>
            <PortOneCheckoutWidget
              orderId={orderId}
              amount={3900}
              orderName="2026년 운세 (본인용)"
              buyerEmail={buyerEmail}
              buyerTel={buyerPhone}
            />
          </CardContent>
        </Card>
      );
    }
  }

  const portoneReady = runtimeConfig.portoneReady;

  return (
    <Card>
      <CardHeader>
        <CardTitle>2026년 운세 (본인용)</CardTitle>
        <p className="text-sm text-zinc-500">3,900원</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!preview && !portoneReady && (
          <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            결제 설정이 완료되면 이용 가능합니다.
          </p>
        )}
        <DateSelect
          id="birthDate"
          label="생년월일 *"
          value={birthDate}
          onChange={setBirthDate}
          required
        />
        <div>
          <Label htmlFor="name">이름 *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 김다봄"
            required
          />
        </div>
        <div>
          <Label htmlFor="relationship">관계 *</Label>
          <CustomSelect
            id="relationship"
            value={relationship}
            onChange={setRelationship}
            placeholder="선택"
            required
            options={[
              { value: "본인", label: "본인" },
              { value: "연인", label: "연인" },
              { value: "배우자", label: "배우자" },
              { value: "가족", label: "가족" },
              { value: "친구", label: "친구" },
              { value: "동료", label: "동료" },
              { value: "지인", label: "지인" },
              { value: "기타", label: "기타" },
            ]}
          />
        </div>
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
        <div className="grid grid-cols-3 gap-2">
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
          <div>
            <Label htmlFor="calendarType">양력 / 음력 *</Label>
            <CustomSelect
              id="calendarType"
              value={calendarType}
              onChange={setCalendarType}
              placeholder="선택"
              required
              options={[
                { value: "solar", label: "양력" },
                { value: "lunar", label: "음력" },
              ]}
            />
          </div>
          <div>
            <Label htmlFor="leapMonthType">평달 / 윤달 *</Label>
            <CustomSelect
              id="leapMonthType"
              value={leapMonthType}
              onChange={setLeapMonthType}
              placeholder="선택"
              required
              options={[
                { value: "regular", label: "평달" },
                { value: "leap", label: "윤달" },
              ]}
            />
          </div>
        </div>
        <InterestSelector selected={interests} onChange={setInterests} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button
          onClick={createOrder}
          disabled={loading || (!preview && !portoneReady)}
          className="w-full"
        >
          {loading ? "처리 중..." : "결제 진행하기"}
        </Button>
      </CardContent>
    </Card>
  );
}
