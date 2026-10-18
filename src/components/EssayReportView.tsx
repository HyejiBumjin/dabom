"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReportContent } from "@/lib/llm/types";
import { MessageReport } from "@/components/MessageReport";
import { ReportPreparing } from "@/components/RetroWindow";
import { ReportErrorState } from "@/components/ReportErrorState";
import { ReportAccessError } from "@/lib/report-access-error";

interface ReportResponse { id: string; status: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED"; content: ReportContent | null; lastError: string | null; recordOpening?: boolean }

export function EssayReportView({ reportId }: { reportId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const generationRequestInFlight = useRef(false);
  const [generationRequestFailed, setGenerationRequestFailed] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const openedReceiptSent = useRef(false);
  const requestReport = useCallback(async (url: string, options?: RequestInit) => {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(options?.method === "POST" ? 65_000 : 15_000) });
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
    refetchInterval: (state) => state.state.status === "error" || state.state.data?.status === "COMPLETED" || state.state.data?.status === "FAILED" ? false : 1500,
    retry: (count, error) => !(error instanceof ReportAccessError && [401, 403, 404].includes(error.status)) && count < 2,
  });

  useEffect(() => {
    if (loginRequired || accessDenied || query.data?.status !== "COMPLETED" || !query.data.content || !query.data.recordOpening) return;
    const controller = new AbortController();
    let inFlight = false;
    const record = () => {
      if (document.visibilityState !== "visible" || openedReceiptSent.current || inFlight || controller.signal.aborted) return;
      inFlight = true;
      void fetch(`/api/saju/reports/${reportId}/opened`, { method: "POST", cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]) })
        .then(response => { if (!controller.signal.aborted && (response.ok || response.status === 404)) openedReceiptSent.current = true; })
        .catch(() => { /* Receipt collection never interrupts the purchased report. */ })
        .finally(() => { inFlight = false; });
    };
    record();
    document.addEventListener("visibilitychange", record);
    return () => { controller.abort(); document.removeEventListener("visibilitychange", record); };
  }, [query.data?.status, query.data?.content, query.data?.recordOpening, reportId, loginRequired, accessDenied]);

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

  if (loginRequired || query.error instanceof ReportAccessError && query.error.status === 401) return <ReportErrorState kind="login" />;
  if (accessDenied || query.error instanceof ReportAccessError && [403, 404].includes(query.error.status)) return <ReportErrorState kind="access" />;

  // An already issued letter remains readable during a background fetch error.
  if (query.data?.status === "COMPLETED" && query.data.content) {
    if (query.data.content.meta?.presentation === "message") return <MessageReport content={query.data.content} />;
    return <article className="retro-letter">{query.data.content.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</article>;
  }
  if (query.isError || query.data?.status === "FAILED" || generationRequestFailed || query.data?.status === "COMPLETED") {
    return <ReportErrorState kind="failed" onRetry={() => void retry()} />;
  }
  return <ReportPreparing />;
}
