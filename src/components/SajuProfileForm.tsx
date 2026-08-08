"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";

export function SajuProfileForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [calendar, setCalendar] = useState("solar");
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!name.trim() || !birthDate || !gender || (!timeUnknown && !birthTime)) {
      setError("이름, 성별, 생년월일과 태어난 시각을 입력해 주세요.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/saju/profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, gender, birthDate, birthTime: timeUnknown ? null : birthTime, calendar, isLeapMonth }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "저장하지 못했습니다.");
      router.push(`/saju/profiles/${data.profileId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={submit} className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
    <div><Label htmlFor="name">이름</Label><Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 김다봄" /></div>
    <div><Label htmlFor="gender">성별</Label><CustomSelect id="gender" value={gender} onChange={setGender} placeholder="선택" options={[{ value: "female", label: "여성" }, { value: "male", label: "남성" }]} /></div>
    <div><Label htmlFor="birthDate">생년월일</Label><Input id="birthDate" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></div>
    <div className="space-y-2"><Label htmlFor="birthTime">태어난 시각</Label><Input id="birthTime" type="time" value={birthTime} disabled={timeUnknown} onChange={(event) => setBirthTime(event.target.value)} /><label className="flex items-center gap-2 text-sm text-zinc-600"><input type="checkbox" checked={timeUnknown} onChange={(event) => setTimeUnknown(event.target.checked)} /> 태어난 시각을 모릅니다</label>{timeUnknown && <p className="text-xs text-amber-700">시주는 확정하지 않은 임시 명식으로 안내합니다.</p>}</div>
    <div><Label htmlFor="calendar">달력 기준</Label><CustomSelect id="calendar" value={calendar} onChange={setCalendar} options={[{ value: "solar", label: "양력" }, { value: "lunar", label: "음력" }]} /></div>
    {calendar === "lunar" && <label className="flex items-center gap-2 text-sm text-zinc-600"><input type="checkbox" checked={isLeapMonth} onChange={(event) => setIsLeapMonth(event.target.checked)} /> 윤달입니다</label>}
    {error && <p className="text-sm text-red-600">{error}</p>}
    <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "명식을 계산하는 중..." : "사주 살펴보기"}</Button>
  </form>;
}
