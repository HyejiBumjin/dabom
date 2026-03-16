"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { DateSelect } from "@/components/ui/date-select";
import { InterestSelector } from "./InterestSelector";

interface GiftReceiverFormProps {
  token: string;
  onSuccess?: (reportId: string) => void;
  /** 화면 디자인 미리보기용 - 제출 비활성화 */
  preview?: boolean;
}

export function GiftReceiverForm({
  token,
  onSuccess,
  preview,
}: GiftReceiverFormProps) {
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState("");
  const [calendarType, setCalendarType] = useState("");
  const [leapMonthType, setLeapMonthType] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const res = await fetch("/api/reports/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "gift",
          giftToken: token,
          input: {
            birthDate,
            birthTime: birthTime || undefined,
            gender: gender || undefined,
            calendarType,
            leapMonthType,
            interests: interests.length > 0 ? interests : undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "운세 생성 실패");
        return;
      }
      onSuccess?.(data.reportId);
      window.location.href = `/reports/${data.reportId}?giftToken=${encodeURIComponent(token)}`;
    } catch {
      setError("운세 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>2026년 운세 선물을 받으셨습니다</CardTitle>
        <p className="text-sm text-zinc-500">
          운세를 보려면 정보를 입력해 주세요.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "운세 만드는 중..." : "운세 보기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
