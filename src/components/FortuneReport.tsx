"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FortuneResult } from "@/lib/fortune/types";

interface FortuneReportProps {
  result: FortuneResult;
  reportId: string;
  giftToken?: string;
}

export function FortuneReport({ result, reportId, giftToken }: FortuneReportProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>2026년 운세</CardTitle>
          <p className="text-sm text-zinc-500">흐름 유형: {result.flowType}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {result.sections.map((s) => (
            <div key={s.title}>
              <h4 className="mb-1 font-medium text-zinc-800">{s.title}</h4>
              <p className="text-sm leading-relaxed text-zinc-600">{s.content}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Link
        href={giftToken ? `/reports/${reportId}/letter?giftToken=${encodeURIComponent(giftToken)}` : `/reports/${reportId}/letter`}
        className="block rounded-lg border border-zinc-200 bg-white p-4 text-center font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
      >
        💌 나에게 보내는 운세 편지 열기
      </Link>
    </div>
  );
}
