"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DevelopmentReportTrigger({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function createReport() {
    setPending(true); setError(null);
    try {
      const response = await fetch(`/api/saju/profiles/${profileId}/reports`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "리포트를 만들지 못했습니다.");
      router.push(`/saju/reports/${data.reportId}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "오류가 발생했습니다."); } finally { setPending(false); }
  }
  return <div className="space-y-3"><Button size="lg" className="w-full" onClick={createReport} disabled={pending}>{pending ? "준비 중..." : "개발용 리포트 생성"}</Button>{error && <p className="text-sm text-red-600">{error}</p>}</div>;
}
