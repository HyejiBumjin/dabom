import OpenAI from "openai";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { buildEssayPrompt } from "@/lib/prompts/v2";
import type { ReportContent } from "./types";
import type { Myeongsik } from "@/lib/saju/myeongsik";

const beats = ["opening", "past", "career", "money_love", "mental", "ending"] as const;
const reportSchema = z.object({
  paragraphs: z.array(z.string().min(1)).min(4),
  meta: z.object({
    beats: z.array(z.enum(beats)).length(6),
    termsUsed: z.array(z.object({ term: z.string().min(1), gloss: z.string().min(1) })),
  }),
});

const outputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["paragraphs", "meta"],
  properties: {
    paragraphs: { type: "array", minItems: 4, items: { type: "string" } },
    meta: {
      type: "object", additionalProperties: false, required: ["beats", "termsUsed"],
      properties: {
        beats: { type: "array", minItems: 6, maxItems: 6, items: { type: "string", enum: beats } },
        termsUsed: { type: "array", items: { type: "object", additionalProperties: false, required: ["term", "gloss"], properties: { term: { type: "string" }, gloss: { type: "string" } } } },
      },
    },
  },
} as const;

const headingPattern = /^\s*(?:#{1,6}\s|\d+[.)]\s|[■◆●]\s|\[[^\]]+\])/m;
const bannedTerms = ["병신", "씨발", "좆", "존나", "개짜증", "GOAT", "긁", "어쩔티비", "킹받다", "스불재", "오조오억", "라떼는", "무조건 대박"];

function validateReport(value: unknown): ReportContent {
  const parsed = reportSchema.parse(value);
  const paragraphs = parsed.paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean);
  const text = paragraphs.join("\n\n");
  const charCount = [...text].length;
  // 모바일에서 읽기 좋은 짧은 에세이로 제한해 응답 지연과 비용을 함께 낮춘다.
  if (charCount < 1200 || charCount > 2000) throw new Error(`본문 분량이 범위를 벗어났습니다: ${charCount}자`);
  if (headingPattern.test(text)) throw new Error("소제목 또는 번호 형식이 포함되었습니다.");
  if (bannedTerms.some((term) => text.includes(term))) throw new Error("금지어가 포함되었습니다.");
  if (new Set(parsed.meta.beats).size !== beats.length) throw new Error("서사 비트가 모두 포함되지 않았습니다.");
  for (const { term, gloss } of parsed.meta.termsUsed) {
    if (!text.includes(term) || !text.includes(gloss)) throw new Error(`용어 풀이가 본문에 없습니다: ${term}`);
  }
  return { paragraphs, meta: { charCount, beats: [...parsed.meta.beats], termsUsed: parsed.meta.termsUsed } };
}

export async function generateReport(reportId: string): Promise<void> {
  const report = await prisma.report.findUnique({ where: { id: reportId }, include: { sajuProfile: true } });
  if (!report || report.status === "COMPLETED") return;
  if (!process.env.OPENAI_API_KEY) {
    await prisma.report.update({ where: { id: reportId }, data: { status: "FAILED", lastError: "OPENAI_API_KEY가 설정되지 않았습니다." } });
    return;
  }

  await prisma.report.update({ where: { id: reportId }, data: { status: "GENERATING", lastError: null } });
  // Serverless 함수가 외부 API 응답을 무한정 기다리지 않도록 제한한다.
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 18_000, maxRetries: 0 });
  let lastError = "리포트 생성에 실패했습니다.";

  // 사용자 요청을 오래 붙잡지 않는다. 재시도는 UI에서 명시적으로 시작한다.
  for (let attempt = 1; attempt <= 1; attempt += 1) {
    try {
      const response = await client.responses.create({
        // 짧은 에세이 생성은 지연과 비용이 작은 모델로 처리한다.
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        store: false,
        max_output_tokens: 1600,
        input: buildEssayPrompt(report.sajuProfile.myeongsik as unknown as Myeongsik),
        text: { format: { type: "json_schema", name: "essay_report", strict: true, schema: outputSchema } },
      });
      const content = validateReport(JSON.parse(response.output_text));
      await prisma.report.update({ where: { id: reportId }, data: { status: "COMPLETED", content: content as unknown as Prisma.InputJsonValue, retryCount: attempt - 1, completedAt: new Date(), lastError: null } });
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "알 수 없는 생성 오류";
      console.warn("[report-generation] failed", { reportId, attempt, message: lastError });
      await prisma.report.update({ where: { id: reportId }, data: { retryCount: attempt, lastError } });
    }
  }
  await prisma.report.update({ where: { id: reportId }, data: { status: "FAILED", lastError } });
}
