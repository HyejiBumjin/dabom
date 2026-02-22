"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (preview) return;
    if (!birthDate) {
      setError("생년월일을 입력해 주세요.");
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
          <div>
            <Label htmlFor="birthDate">생년월일 *</Label>
            <Input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="birthTime">출생시간 (선택)</Label>
            <Input
              id="birthTime"
              type="time"
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
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "운세 만드는 중..." : "운세 보기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
