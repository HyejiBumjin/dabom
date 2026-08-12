import OpenAI from "openai";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { buildReportEvidencePrompt, REPORT_DEVELOPER_INSTRUCTIONS } from "@/lib/prompts/v6";
import { buildReportRenderPayload } from "@/lib/saju/report-payload";
import type { Myeongsik } from "@/lib/saju/myeongsik";
import type { ReportContent } from "./types";

const sectionSchema = z.object({ section_id: z.string(), paragraph: z.string().min(250).max(460), fragment_ids: z.array(z.string()).min(1) });
const reportSchema = z.object({ sections: z.array(sectionSchema).length(6) });
const reportOutputSchema = {
  type: "object", additionalProperties: false, required: ["sections"], properties: {
    sections: {
      type: "array", minItems: 6, maxItems: 6,
      items: {
        type: "object", additionalProperties: false, required: ["section_id", "paragraph", "fragment_ids"], properties: {
          section_id: { type: "string" },
          paragraph: { type: "string", minLength: 250, maxLength: 460 },
          fragment_ids: { type: "array", minItems: 1, items: { type: "string" } },
        },
      },
    },
  },
} as const;
const forbiddenPhrases = ["기준을 바로잡아", "점검해봐", "신중한 자세", "신중하게", "규칙적인 생활", "루틴", "마음을 다잡고", "자기계발", "현명한 방법", "완벽하지 않아도 괜찮아", "토닥토닥", "사주에 따르면", "사주를 보니"];

function validateReport(raw: unknown, context: ReturnType<typeof buildReportRenderPayload>): ReportContent {
  const rendered = reportSchema.parse(raw);
  const expected = context.payload.sections;
  const paragraphs = rendered.sections.map((section, index) => {
    const expectedSection = expected[index];
    if (section.section_id !== expectedSection.id) throw new Error(`리포트 section 순서가 맞지 않습니다: ${section.section_id}`);
    const allowedIds = new Set(expectedSection.fragments.map((fragment) => fragment.id));
    if (section.fragment_ids.some((id) => !allowedIds.has(id))) throw new Error(`${section.section_id}에 선택되지 않은 조각이 인용되었습니다.`);
    return section.paragraph.trim();
  });
  const text = paragraphs.join("\n\n");
  const forbidden = forbiddenPhrases.find((phrase) => text.includes(phrase));
  if (forbidden) throw new Error(`렌더링 금지 표현이 포함되었습니다: ${forbidden}`);
  if (/광고|외부 공유|삼성 광고|이하에|200자를 넘지/.test(text)) throw new Error("비정상 렌더링 문구가 포함되었습니다.");
  if ([...text].length < 1_500) throw new Error("리포트 분량이 부족합니다.");
  return {
    paragraphs,
    meta: {
      charCount: [...text].length,
      beats: rendered.sections.map((section) => `${section.section_id}:${section.fragment_ids.join(",")}`),
      termsUsed: context.reportFacts.facts.map((fact) => ({ term: fact.value, gloss: fact.basis })),
    },
  };
}

/** One structured rendering pass. Facts and approved corpus selection stay outside the LLM. */
export async function generateReport(reportId: string): Promise<void> {
  const report = await prisma.report.findUnique({ where: { id: reportId }, include: { sajuProfile: true } });
  if (!report || report.status === "COMPLETED") return;
  if (!process.env.OPENAI_API_KEY) {
    await prisma.report.update({ where: { id: reportId }, data: { status: "FAILED", lastError: "OPENAI_API_KEY가 설정되지 않았습니다." } });
    return;
  }
  const claim = await prisma.report.updateMany({ where: { id: reportId, status: { in: ["PENDING", "FAILED"] } }, data: { status: "GENERATING", lastError: null } });
  if (claim.count === 0) return;

  const context = buildReportRenderPayload(report.sajuProfile.myeongsik as unknown as Myeongsik, report.sajuProfile.name);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 50_000, maxRetries: 0 });
  let lastError = "리포트 생성에 실패했습니다.";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await client.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        store: false,
        max_output_tokens: 3_400,
        input: [
          { role: "developer", content: REPORT_DEVELOPER_INSTRUCTIONS },
          ...(attempt > 1 ? [{ role: "developer" as const, content: `직전 출력 검증 실패: ${lastError}. outline 순서와 fragment_ids를 다시 확인하고, 선택된 재료 안에서만 다시 작성하세요.` }] : []),
          { role: "user", content: buildReportEvidencePrompt(context.payload) },
        ],
        text: { format: { type: "json_schema", name: "saju_corpus_report", strict: true, schema: reportOutputSchema } },
      });
      const content = validateReport(JSON.parse(response.output_text), context);
      await prisma.report.update({
        where: { id: reportId },
        data: { status: "COMPLETED", content: content as unknown as Prisma.InputJsonValue, retryCount: attempt - 1, completedAt: new Date(), lastError: null },
      });
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "알 수 없는 생성 오류";
      await prisma.report.update({ where: { id: reportId }, data: { retryCount: attempt, lastError } });
    }
  }
  await prisma.report.update({ where: { id: reportId }, data: { status: "FAILED", lastError } });
}
