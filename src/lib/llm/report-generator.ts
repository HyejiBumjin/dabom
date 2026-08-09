import OpenAI from "openai";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { buildReportEvidencePrompt, REPORT_DEVELOPER_INSTRUCTIONS } from "@/lib/prompts/v6";
import type { ReportContent } from "./types";
import type { Myeongsik } from "@/lib/saju/myeongsik";

const reportSchema = z.object({
  paragraphs: z.array(z.string().min(220).max(320)).length(6),
});

const outputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["paragraphs"],
  properties: {
    // 문단마다 상한을 두면 한 문단이 길어져 JSON 응답 전체가 잘리는 일을 막을 수 있다.
    paragraphs: { type: "array", minItems: 6, maxItems: 6, items: { type: "string", minLength: 220, maxLength: 320 } },
  },
} as const;

function validateReport(value: unknown): ReportContent {
  const parsed = reportSchema.parse(value);
  const paragraphs = parsed.paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean);
  if (paragraphs.length !== 6) throw new Error("문단 수가 맞지 않습니다.");
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
  // GPT-4o가 6문단의 완성된 편지를 쓰는 시간은 계산 API보다 길다.
  // 중간 JSON을 저장하지 않기 위해 리포트 호출에만 여유 시간을 준다.
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45_000, maxRetries: 0 });
  let lastError = "리포트 생성에 실패했습니다.";

  // 사용자 요청을 오래 붙잡지 않는다. 재시도는 UI에서 명시적으로 시작한다.
  for (let attempt = 1; attempt <= 1; attempt += 1) {
    try {
      const response = await client.responses.create({
        // 사용자에게 전달되는 본문은 글맛과 지시 이행이 좋은 모델로 작성한다.
        model: process.env.OPENAI_MODEL || "gpt-4o",
        store: false,
        max_output_tokens: 2200,
        input: [
          { role: "developer", content: REPORT_DEVELOPER_INSTRUCTIONS },
          { role: "user", content: buildReportEvidencePrompt(report.sajuProfile.myeongsik as unknown as Myeongsik) },
        ],
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
