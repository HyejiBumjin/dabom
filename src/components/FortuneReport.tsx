"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FortuneResult } from "@/lib/fortune/types";
import { LetterCreator } from "./LetterCreator";

interface FortuneReportProps {
  result: FortuneResult;
  reportId: string;
  giftToken?: string;
  fromList?: boolean;
  ablecityRaw?: Record<string, unknown> | null;
}

export function FortuneReport({ result, reportId, giftToken, fromList, ablecityRaw }: FortuneReportProps) {
  const [openLetter, setOpenLetter] = useState(false);
  const normalize = (v: string) => v.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
  const stripLeadingPunctuation = (v: string) => v.replace(/^[\s\-:;,.!?]+/, "");
  const removeLeadingDuplicateSentence = (summary: string, content: string) => {
    const text = content.trim();
    const head = summary.trim();
    if (!text) return text;
    if (head && text.startsWith(head)) {
      return stripLeadingPunctuation(text.slice(head.length)).trim();
    }

    const firstSentenceMatch = text.match(/^[^\n.!?]+[.!?]/);
    if (!firstSentenceMatch) return text;
    const firstSentence = firstSentenceMatch[0].trim();
    if (normalize(firstSentence) === normalize(summary)) {
      return stripLeadingPunctuation(text.slice(firstSentenceMatch[0].length)).trim();
    }
    return text;
  };

  useEffect(() => {
    if (!openLetter) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [openLetter]);

  const isMonthlySection = (content: string) =>
    /(^|\n)1월/.test(content) && /(^|\n)12월/.test(content);

  const renderMonthlyBody = (content: string) => {
    const blocks = content.split(/\n\n/).filter(Boolean);
    return (
      <div className="space-y-5">
        {blocks.map((block, idx) => {
          const lines = block.split("\n");
          const monthHeader = lines[0]?.trim();
          const prose = lines.slice(1).join(" ").replace(/^[\s]+/, "").trim();
          if (!monthHeader) return null;
          return (
            <div key={idx}>
              <p className="mb-1 text-sm font-semibold text-zinc-700">{monthHeader}</p>
              <p className="text-sm leading-relaxed text-zinc-600">{prose}</p>
            </div>
          );
        })}
      </div>
    );
  };

  const renderProseBody = (summary: string, content: string) => {
    const deduped = removeLeadingDuplicateSentence(summary, content);
    const stripped = deduped.replace(/^[\s\-•·]+/gm, "").replace(/\n[\s\-•·]+/g, " ");
    const sentences = stripped
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const paragraphs: string[] = [];
    for (let i = 0; i < sentences.length; i += 3) {
      paragraphs.push(sentences.slice(i, i + 3).join(" "));
    }
    return (
      <div className="space-y-3">
        {paragraphs.map((p, idx) => (
          <p key={`${idx}:${p.slice(0, 16)}`} className="text-sm leading-[1.8] text-zinc-600">
            {p}
          </p>
        ))}
      </div>
    );
  };

  const renderSectionBody = (summary: string, content: string) => {
    if (isMonthlySection(content)) return renderMonthlyBody(content);
    return renderProseBody(summary, content);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <CardTitle>{result.headline || "2026년 운세 리포트"}</CardTitle>
            {result.subheadline && (
              <p className="text-base font-medium text-zinc-800">{result.subheadline}</p>
            )}
            <span className="inline-flex w-fit rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
              흐름 유형: {result.flowType}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {result.sections.map((s) => (
            <section key={s.title} className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="mb-1 text-xs font-medium tracking-wide text-zinc-500">{s.title}</p>
              <h4 className="mb-2 text-lg font-semibold text-zinc-800">{s.headline || s.title}</h4>
              {renderSectionBody(s.headline || s.title, s.content)}
            </section>
          ))}
        </CardContent>
      </Card>
      <button
        type="button"
        onClick={() => setOpenLetter(true)}
        className="block w-full rounded-lg border border-zinc-200 bg-white p-4 text-center font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
      >
        💌 나에게 보내는 운세 편지 열기
      </button>

      {openLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900">나에게 보내는 운세 편지</h3>
              <Button variant="ghost" size="sm" onClick={() => setOpenLetter(false)}>
                닫기
              </Button>
            </div>
            <LetterCreator
              reportId={reportId}
              giftToken={giftToken}
            />
          </div>
        </div>
      )}

      {process.env.NODE_ENV !== "production" && ablecityRaw && (
        <Card>
          <CardHeader>
            <CardTitle>Ablecity Raw Response (Test)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-96 overflow-auto rounded-md bg-zinc-950 p-3 text-xs text-zinc-100">
              {JSON.stringify(ablecityRaw, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
