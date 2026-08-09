import OpenAI from "openai";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { buildReportEvidencePrompt, REPORT_DEVELOPER_INSTRUCTIONS } from "@/lib/prompts/v6";
import type { ReportContent } from "./types";
import type { Myeongsik } from "@/lib/saju/myeongsik";
import { buildReportScript, type ReportScript } from "@/lib/saju/report-script";

const reportSchema = z.object({
  paragraphs: z.array(z.string().min(250).max(320)).length(6),
});

const outputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["paragraphs"],
  properties: {
    // Bound chunks so the JSON response always finishes. We rebuild natural paragraph
    // boundaries from complete sentences below because a model may split an item at its limit.
    paragraphs: { type: "array", minItems: 6, maxItems: 6, items: { type: "string", minLength: 250, maxLength: 320 } },
  },
} as const;

function normalizeParagraphs(chunks: string[]) {
  const text = chunks.join("").replace(/([.!?])(?=[^\s])/g, "$1 ").replace(/\s+/g, " ").trim();
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [text];
  const paragraphs: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const remainingParagraphs = 6 - paragraphs.length;
    const remainingLength = text.length - paragraphs.join("").length - current.length;
    const targetLength = Math.ceil(remainingLength / remainingParagraphs);
    if (current && current.length + sentence.length > targetLength && paragraphs.length < 5) {
      paragraphs.push(current);
      current = sentence;
    } else {
      current = `${current}${current ? " " : ""}${sentence}`;
    }
  }
  if (current) paragraphs.push(current);

  while (paragraphs.length > 6) {
    const last = paragraphs.pop();
    if (last) paragraphs[paragraphs.length - 1] = `${paragraphs[paragraphs.length - 1]} ${last}`;
  }
  while (paragraphs.length < 6) {
    const longestIndex = paragraphs.reduce((best, paragraph, index, values) => paragraph.length > values[best].length ? index : best, 0);
    const source = paragraphs[longestIndex];
    const splitAt = source.lastIndexOf(" ", Math.ceil(source.length / 2));
    if (splitAt < 1) break;
    paragraphs.splice(longestIndex, 1, source.slice(0, splitAt).trim(), source.slice(splitAt + 1).trim());
  }
  return paragraphs;
}

const forbiddenPhrases = ["기준을 바로잡아", "점검해봐", "신중한 자세", "규칙적인 생활", "마음을 다잡고", "자기계발"];

function validateReport(value: unknown, _script: ReportScript): ReportContent {
  const parsed = reportSchema.parse(value);
  const paragraphs = normalizeParagraphs(parsed.paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean));
  if (paragraphs.length !== 6) throw new Error("문단 수가 맞지 않습니다.");
  const text = paragraphs.join("\n\n");
  const forbidden = forbiddenPhrases.find((phrase) => text.includes(phrase));
  if (forbidden) throw new Error(`렌더링 금지 표현이 포함되었습니다: ${forbidden}`);
  if ([...text].length < 1_450) throw new Error("리포트 분량이 부족합니다.");

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

  const script = buildReportScript(report.sajuProfile.myeongsik as unknown as Myeongsik, report.sajuProfile.name);
  // 금지 표현·핵심 비트 누락은 한 번 더 작문하게 한다. 계산을 다시 하지는 않는다.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await client.responses.create({
        // 사용자에게 전달되는 본문은 글맛과 지시 이행이 좋은 모델로 작성한다.
        model: process.env.OPENAI_MODEL || "gpt-4o",
        store: false,
        max_output_tokens: 2200,
        input: [
          { role: "developer", content: REPORT_DEVELOPER_INSTRUCTIONS },
          ...(attempt > 1 ? [{ role: "developer" as const, content: `직전 초안이 코드 검증을 통과하지 못했습니다: ${lastError}. 대본의 6비트를 빠짐없이 유지하고 금지 표현 없이 처음부터 다시 작성하세요.` }] : []),
          { role: "user", content: buildReportEvidencePrompt(script) },
        ],
        text: { format: { type: "json_schema", name: "essay_report", strict: true, schema: outputSchema } },
      });
      const content = validateReport(JSON.parse(response.output_text), script);
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
