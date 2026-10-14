"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReportContent } from "@/lib/llm/types";
import { PUBLIC_REPORT_FAILURE_MESSAGE } from "@/lib/llm/report-messages";
import { MessageReport } from "@/components/MessageReport";
import { PixelCat, ReportPreparing } from "@/components/RetroWindow";
import { ReportAccessError } from "@/lib/report-access-error";

interface ReportResponse { id: string; status: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED"; content: ReportContent | null; lastError: string | null }

export function EssayReportView({ reportId }: { reportId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const generationRequestInFlight = useRef(false);
  const [generationRequestFailed, setGenerationRequestFailed] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const requestReport = useCallback(async (url: string, options?: RequestInit) => {
    const response = await fetch(url, options);
    if (response.status === 401) {
      setLoginRequired(true);
      queryClient.removeQueries({ queryKey: ["saju-report", reportId] });
      router.replace(`/login?next=${encodeURIComponent(`/saju/reports/${reportId}`)}`);
    }
    if (response.status === 403 || response.status === 404) {
      setAccessDenied(true);
      queryClient.removeQueries({ queryKey: ["saju-report", reportId] });
    }
    return response;
  }, [reportId, router, queryClient]);
  const query = useQuery({
    queryKey: ["saju-report", reportId],
    enabled: !loginRequired && !accessDenied,
    queryFn: async (): Promise<ReportResponse> => {
      const response = await requestReport(`/api/saju/reports/${reportId}`, { cache: "no-store" });
      if (!response.ok) throw new ReportAccessError(response.status);
      return response.json();
    },
    refetchInterval: (state) => state.state.data?.status === "COMPLETED" || state.state.data?.status === "FAILED" ? false : 1500,
    retry: (count, error) => !(error instanceof ReportAccessError && [401, 403, 404].includes(error.status)) && count < 2,
  });

  useEffect(() => {
    if (loginRequired || generationRequestInFlight.current || generationRequestFailed || query.data?.status !== "PENDING") return;
    generationRequestInFlight.current = true;
    void requestReport(`/api/saju/reports/${reportId}/generate`, { method: "POST" }).then(response => {
      if (!response.ok) setGenerationRequestFailed(true);
    }).catch(() => {
      setGenerationRequestFailed(true);
    }).finally(() => {
      generationRequestInFlight.current = false;
      void queryClient.invalidateQueries({ queryKey: ["saju-report", reportId] });
    });
  }, [query.data?.status, queryClient, reportId, generationRequestFailed, loginRequired, requestReport]);

  async function retry() {
    if (generationRequestInFlight.current) return;
    generationRequestInFlight.current = true;
    setGenerationRequestFailed(false);
    try {
      if (query.data?.status === "FAILED" || query.data?.status === "PENDING") {
        queryClient.setQueryData(["saju-report", reportId], { ...query.data, status: "GENERATING", lastError: null });
        const response = await requestReport(`/api/saju/reports/${reportId}/generate`, { method: "POST" });
        if (!response.ok) setGenerationRequestFailed(true);
      } else await query.refetch();
    } catch {
      setGenerationRequestFailed(true);
    } finally {
      generationRequestInFlight.current = false;
      await queryClient.invalidateQueries({ queryKey: ["saju-report", reportId] });
    }
  }

  if (loginRequired || query.error instanceof ReportAccessError && query.error.status === 401) return <section className="retro-status" role="status"><PixelCat className="retro-cat-large" /><h2 className="retro-heading">로그인 화면으로 이동할게.</h2><p className="retro-status-copy">카카오로 로그인하면<br />보던 운세로 돌아올 수 있어.</p></section>;
  if (accessDenied || query.error instanceof ReportAccessError && [403, 404].includes(query.error.status)) return <section className="retro-status" role="alert"><PixelCat className="retro-cat-large" /><h2 className="retro-heading">리포트를 열 수 없어.</h2><p className="retro-status-copy">내 운세함에서 구매한 운세를 확인해줘.</p></section>;

  // An already issued letter remains readable during a background fetch error.
  if (query.data?.status === "COMPLETED" && query.data.content) {
    if (query.data.content.meta?.presentation === "message") return <MessageReport content={query.data.content} />;
    return <article className="retro-letter">{query.data.content.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</article>;
  }
  if (query.isError || query.data?.status === "FAILED" || generationRequestFailed || query.data?.status === "COMPLETED") {
    return <section className="retro-status retro-status--error" role="alert"><PixelCat className="retro-cat-large" /><h2 className="retro-heading">리포트를 준비하지 못했어요.</h2><p className="retro-status-copy">{PUBLIC_REPORT_FAILURE_MESSAGE}</p><button type="button" onClick={() => void retry()} className="retro-button">다시 시도하기</button></section>;
  }
  return <ReportPreparing />;
}
