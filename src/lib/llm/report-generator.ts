import OpenAI from "openai";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { buildReportEvidencePrompt, REPORT_DEVELOPER_INSTRUCTIONS } from "@/lib/prompts/v6";
import { buildReportRenderPayload } from "@/lib/saju/report-payload";
import type { Myeongsik } from "@/lib/saju/myeongsik";
import type { ReportContent } from "./types";

const sectionSchema = z.object({ section_id: z.string(), paragraph: z.string().min(430).max(620) });
const reportSchema = z.object({ sections: z.array(sectionSchema).length(6) });
const reportOutputSchema = {
  type: "object", additionalProperties: false, required: ["sections"], properties: {
    sections: {
      type: "array", minItems: 6, maxItems: 6,
      items: {
        type: "object", additionalProperties: false, required: ["section_id", "paragraph"], properties: {
          section_id: { type: "string" },
          paragraph: { type: "string", minLength: 430, maxLength: 620 },
        },
      },
    },
  },
} as const;

function validateReport(raw: unknown, context: ReturnType<typeof buildReportRenderPayload>): ReportContent {
  const rendered = reportSchema.parse(raw);
  const expected = context.payload.sections;
  const paragraphs = rendered.sections.map((section, index) => {
    const expectedSection = expected[index];
    if (section.section_id !== expectedSection.id) throw new Error(`리포트 section 순서가 맞지 않습니다: ${section.section_id}`);
    const paragraph = section.paragraph.trim().replace(/\p{Extended_Pictographic}/gu, "").replace(/\s{2,}/g, " ");
    if (!expectedSection.required_factual_terms.some((term) => paragraph.includes(term))) throw new Error(`${section.section_id}에 필수 사주 근거가 빠졌습니다.`);
    if (expectedSection.required_timing_terms.some((term) => !paragraph.includes(term))) throw new Error(`${section.section_id}에 올해 월운 시점이 빠졌습니다.`);
    if (expectedSection.prohibited_terms.some((term) => paragraph.includes(term))) throw new Error(`${section.section_id}에 다른 문단 전용 시점이 반복되었습니다.`);
    if (!expectedSection.required_scene_terms.every((alternatives) => alternatives.some((term) => paragraph.includes(term)))) {
      throw new Error(`${section.section_id}에 선택된 현실 장면이 빠졌습니다.`);
    }
    return paragraph;
  });
  const text = paragraphs.join("\n\n");
  if (/\[[^\]]+\]/.test(text)) throw new Error("내부 추적 태그가 본문에 노출되었습니다.");
  if (/(?:^|\s)#\s*(?:required|mechanism|translation|concrete\s*scene|yearly\s*[-:]|scene\s*terms?|factual\s*terms?)/imu.test(text)) {
    throw new Error("내부 입력 라벨이 본문에 노출되었습니다.");
  }
  if (/광고|외부 공유|삼성 광고|이하에|200자를 넘지/.test(text)) throw new Error("비정상 렌더링 문구가 포함되었습니다.");
  if ([...text].length < 2_580) throw new Error("리포트 분량이 부족합니다.");
  return {
    paragraphs,
    meta: {
      charCount: [...text].length,
      beats: context.selected.sections.map((section) => `${section.id}:${section.fragments.map((fragment) => fragment.id).join(",")}`),
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

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await client.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        store: false,
        max_output_tokens: 4_800,
        input: [
          { role: "developer", content: REPORT_DEVELOPER_INSTRUCTIONS },
          ...(attempt > 1 ? [{ role: "developer" as const, content: `직전 출력 검증 실패: ${lastError}. 각 문단의 required_factual_terms 중 하나는 반드시 원문 그대로 포함하세요. 특히 relation에서 충 또는 합이 요구되면 그 한자를 문단 첫 두 문장 안에 정확히 쓰세요. 내부 라벨·해시 표기 없이, 선택된 재료 안에서만 다시 작성하세요.` }] : []),
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
