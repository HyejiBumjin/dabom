"use client";

import { useState } from "react";
import {
  MOCK_ESSAY,
  MOCK_MYEONGSIK,
  TEASER_PARAGRAPH_COUNT,
  ALL_BEATS,
  CHAR_MIN,
  CHAR_MAX,
} from "./mockReport";

type ViewMode = "full" | "teaser";

export default function EssayReportPreviewPage() {
  const [mode, setMode] = useState<ViewMode>("full");
  const [showMeta, setShowMeta] = useState(false);

  const { paragraphs, meta } = MOCK_ESSAY;
  const charCount = paragraphs.join("").length;
  const isTeaser = mode === "teaser";
  const visible = isTeaser ? paragraphs.slice(0, TEASER_PARAGRAPH_COUNT) : paragraphs;
  const locked = isTeaser ? paragraphs.slice(TEASER_PARAGRAPH_COUNT) : [];
  const teaserCharCount = paragraphs.slice(0, TEASER_PARAGRAPH_COUNT).join("").length;

  return (
    <div className="w-full space-y-4 py-8">
      {/* 미리보기 전용 컨트롤 — 실제 제품에는 없음 */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-white/60 p-3">
        <span className="text-xs font-medium text-zinc-500">미리보기 전환</span>
        {(
          [
            ["full", "전체 리포트"],
            ["teaser", "무료 티저 (결제 전)"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              mode === value
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowMeta((v) => !v)}
          className="ml-auto rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200"
        >
          {showMeta ? "검증 패널 숨기기" : "검증 패널 보기"}
        </button>
      </div>

      <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {/* 명식 헤더 — 티저에서도 공개되는 영역 */}
        <header className="border-b border-zinc-100 px-6 pb-6 pt-7 sm:px-9">
          <p className="text-xs tracking-wide text-zinc-400">2026년 사주 리포트</p>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900">
            {MOCK_MYEONGSIK.name}님의 2026년
          </h1>
          <p className="mt-1 text-sm text-zinc-500">{MOCK_MYEONGSIK.birthLabel}</p>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {MOCK_MYEONGSIK.pillars.map((p) => (
              <div
                key={p.label}
                className="rounded-xl bg-zinc-50 py-3 text-center"
              >
                <p className="text-[11px] text-zinc-400">{p.label}</p>
                <p className="mt-0.5 text-lg font-semibold tracking-tight text-zinc-800">
                  {p.value}
                </p>
              </div>
            ))}
          </div>
        </header>

        {/* 본문 — 소제목/번호/카드 구분 없이 단락만 이어진다 */}
        <div className="px-6 py-8 sm:px-9">
          <div className="mx-auto max-w-[36rem]">
            {visible.map((p, i) => (
              <p
                key={i}
                className="text-[15px] leading-[1.95] text-zinc-700 [&:not(:first-child)]:mt-6 sm:text-base"
              >
                {p}
              </p>
            ))}

            {isTeaser && locked.length > 0 && (
              <div className="relative mt-6">
                <div
                  aria-hidden
                  className="pointer-events-none select-none blur-[5px] saturate-50"
                >
                  {locked.slice(0, 2).map((p, i) => (
                    <p
                      key={i}
                      className="text-[15px] leading-[1.95] text-zinc-700 [&:not(:first-child)]:mt-6 sm:text-base"
                    >
                      {p}
                    </p>
                  ))}
                </div>
                <div className="absolute inset-x-0 bottom-0 top-16 bg-gradient-to-b from-transparent via-white/85 to-white" />
                <div className="relative -mt-16 flex flex-col items-center gap-3 pb-2 text-center">
                  <p className="text-sm text-zinc-600">
                    여기부터가 진짜인데, 이어지는 이야기는 잠겨 있어요.
                  </p>
                  <button
                    type="button"
                    className="w-full max-w-xs rounded-xl bg-zinc-900 px-5 py-3.5 text-sm font-semibold text-white"
                  >
                    전체 리포트 보기 · 3,900원
                  </button>
                  <p className="text-xs text-zinc-400">
                    남은 이야기 {locked.length}단락 · 커리어 타이밍, 돈, 연애, 멘탈까지
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </article>

      {/* step-2 저장 전 검증 항목을 눈으로 확인하는 패널 (제품에는 없음) */}
      {showMeta && (
        <div className="space-y-4 rounded-2xl border border-dashed border-zinc-300 bg-white p-5 text-sm">
          <div>
            <p className="mb-1 font-semibold text-zinc-800">분량</p>
            <p className="text-zinc-600">
              본문 {charCount.toLocaleString()}자 / 목표 {CHAR_MIN.toLocaleString()}~
              {CHAR_MAX.toLocaleString()}자{" "}
              <span
                className={
                  charCount >= CHAR_MIN && charCount <= CHAR_MAX
                    ? "font-medium text-emerald-600"
                    : "font-medium text-red-600"
                }
              >
                {charCount >= CHAR_MIN && charCount <= CHAR_MAX
                  ? "통과"
                  : charCount < CHAR_MIN
                    ? `하한 미달 (${(CHAR_MIN - charCount).toLocaleString()}자 부족)`
                    : `상한 초과 (${(charCount - CHAR_MAX).toLocaleString()}자 초과)`}
              </span>
            </p>
            <p className="mt-1 text-zinc-500">
              단락 {paragraphs.length}개 · 티저 공개분 {teaserCharCount.toLocaleString()}자
            </p>
          </div>

          <div>
            <p className="mb-1.5 font-semibold text-zinc-800">서사 비트 커버</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_BEATS.map((b) => {
                const covered = meta.beats.includes(b.key);
                return (
                  <span
                    key={b.key}
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      covered
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {covered ? "✓" : "✕"} {b.label}
                  </span>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1.5 font-semibold text-zinc-800">
              용어 풀이 ({meta.termsUsed.length}개)
            </p>
            <ul className="space-y-1 text-zinc-600">
              {meta.termsUsed.map((t) => {
                const inBody = paragraphs.some((p) => p.includes(t.term));
                return (
                  <li key={t.term} className="flex gap-2">
                    <span className={inBody ? "text-emerald-600" : "text-red-600"}>
                      {inBody ? "✓" : "✕"}
                    </span>
                    <span>
                      <strong className="font-medium text-zinc-800">{t.term}</strong> —{" "}
                      {t.gloss}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className="mb-1 font-semibold text-zinc-800">형식</p>
            <p className="text-zinc-600">
              소제목·번호 머리 미포함{" "}
              <span className="font-medium text-emerald-600">
                {paragraphs.some((p) => /^\s*(■|\d+[.)]|#{1,6}\s|\[.+\])/.test(p))
                  ? "위반"
                  : "통과"}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
