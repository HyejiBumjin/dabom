"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReportContent } from "@/lib/llm/types";

interface ReportResponse { id: string; status: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED"; content: ReportContent | null; lastError: string | null }

export function EssayReportView({ reportId }: { reportId: string }) {
  const queryClient = useQueryClient();
  const generationRequestInFlight = useRef(false);
  const query = useQuery({
    queryKey: ["saju-report", reportId],
    queryFn: async (): Promise<ReportResponse> => {
      const response = await fetch(`/api/saju/reports/${reportId}`, { cache: "no-store" });
      if (!response.ok) throw new Error("리포트를 불러오지 못했습니다.");
      return response.json();
    },
    refetchInterval: (state) => state.state.data?.status === "COMPLETED" || state.state.data?.status === "FAILED" ? false : 1500,
  });

  useEffect(() => {
    if (generationRequestInFlight.current || query.data?.status !== "PENDING") return;
    generationRequestInFlight.current = true;
    void fetch(`/api/saju/reports/${reportId}/generate`, { method: "POST" }).finally(() => {
      generationRequestInFlight.current = false;
      void queryClient.invalidateQueries({ queryKey: ["saju-report", reportId] });
    });
  }, [query.data?.status, queryClient, reportId]);

  async function retry() {
    if (generationRequestInFlight.current) return;
    generationRequestInFlight.current = true;
    try {
      await fetch(`/api/saju/reports/${reportId}/generate`, { method: "POST" });
    } finally {
      generationRequestInFlight.current = false;
      await queryClient.invalidateQueries({ queryKey: ["saju-report", reportId] });
    }
  }

  if (query.isLoading || !query.data || query.data.status === "PENDING" || query.data.status === "GENERATING") {
    return <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center shadow-sm"><p className="text-3xl">🔮</p><p className="mt-5 text-lg font-medium text-zinc-900">사주를 열어보는 중...</p><p className="mt-2 text-sm text-zinc-500">한 편의 편지를 정성껏 준비하고 있어요.</p></div>;
  }
  if (query.isError || query.data.status === "FAILED") {
    return <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center"><p className="font-medium text-red-900">리포트를 준비하지 못했어요.</p><p className="mt-2 text-sm text-red-700">{query.data?.lastError || "잠시 후 다시 시도해 주세요."}</p><button type="button" onClick={() => void retry()} className="mt-5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">다시 시도하기</button></div>;
  }
  return <article className="rounded-2xl border border-zinc-200 bg-white px-6 py-10 shadow-sm sm:px-12 sm:py-14"><div className="mx-auto max-w-prose space-y-7 text-[17px] leading-8 text-zinc-800 sm:text-lg sm:leading-9">{query.data.content?.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></article>;
}
