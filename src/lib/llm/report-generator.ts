import OpenAI from "openai";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { buildEssayPrompt } from "@/lib/prompts/v3";
import type { ReportContent } from "./types";
import type { Myeongsik } from "@/lib/saju/myeongsik";

const reportSchema = z.object({
  paragraphs: z.array(z.string().min(1)).min(4).max(6),
});

const outputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["paragraphs"],
  properties: {
    paragraphs: { type: "array", minItems: 4, maxItems: 6, items: { type: "string", minLength: 1 } },
  },
} as const;

function validateReport(value: unknown): ReportContent {
  const parsed = reportSchema.parse(value);
  const paragraphs = parsed.paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean);
  if (paragraphs.length < 4) throw new Error("문단이 충분하지 않습니다.");
  const text = paragraphs.join("\n\n");
  const charCount = [...text].length;
  return { paragraphs, meta: { charCount, beats: [], termsUsed: [] } };
}

export async function generateReport(reportId: string): Promise<void> {
  const report = await prisma.report.findUnique({ where: { id: reportId }, include: { sajuProfile: true } });
  if (!report || report.status === "COMPLETED") return;
  if (!process.env.OPENAI_API_KEY) {
    await prisma.report.update({ where: { id: reportId }, data: { status: "FAILED", lastError: "OPENAI_API_KEY가 설정되지 않았습니다." } });
    return;
  }

  // 동시에 들어온 화면 요청 중 한 건만 생성권을 갖는다.
  const claim = await prisma.report.updateMany({
    where: { id: reportId, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "GENERATING", lastError: null },
  });
  if (claim.count === 0) return;
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
        max_output_tokens: 1300,
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
