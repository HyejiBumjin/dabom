import OpenAI from "openai";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { REPORT_DEVELOPER_INSTRUCTIONS } from "@/lib/prompts/v6";
import type { ReportContent } from "./types";
import type { Myeongsik } from "@/lib/saju/myeongsik";
import { buildReportScript, type ReportScript } from "@/lib/saju/report-script";

const bitSchema = z.object({ paragraph: z.string().min(250).max(420) });
const bitOutputSchema = { type: "object", additionalProperties: false, required: ["paragraph"], properties: { paragraph: { type: "string", minLength: 250, maxLength: 420 } } } as const;
const forbiddenPhrases = ["기준을 바로잡아", "점검해봐", "신중한 자세", "규칙적인 생활", "마음을 다잡고", "자기계발"];
function evidenceTerms(sajuFact: string) {
  return [...new Set(sajuFact.match(/[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]{1,2}|[가-힣]{2,4}/g) ?? [])]
    .filter((term) => !["세운", "대운", "일간", "원국", "천간", "월운"].includes(term));
}

function validateReport(paragraphs: string[], script: ReportScript): ReportContent {
  if (paragraphs.length !== 6) throw new Error("문단 수가 맞지 않습니다.");
  const anchored = paragraphs.map((paragraph, index) => {
    const terms = evidenceTerms(script.bits[index].sajuFact);
    return terms.some((term) => paragraph.includes(term)) ? paragraph : `${paragraph} 이 대목의 사주 근거는 ${script.bits[index].sajuFact}야.`;
  });
  const text = anchored.join("\n\n");
  const forbidden = forbiddenPhrases.find((phrase) => text.includes(phrase));
  if (forbidden) throw new Error(`렌더링 금지 표현이 포함되었습니다: ${forbidden}`);
  if (/광고|외부 공유|삼성 광고|이하에|200자를 넘지/.test(text)) throw new Error("비정상 렌더링 문구가 포함되었습니다.");
  if ([...text].length < 1_450) throw new Error("리포트 분량이 부족합니다.");
  return { paragraphs: anchored, meta: { charCount: [...text].length, beats: [], termsUsed: [] } };
}

export async function generateReport(reportId: string): Promise<void> {
  const report = await prisma.report.findUnique({ where: { id: reportId }, include: { sajuProfile: true } });
  if (!report || report.status === "COMPLETED") return;
  if (!process.env.OPENAI_API_KEY) { await prisma.report.update({ where: { id: reportId }, data: { status: "FAILED", lastError: "OPENAI_API_KEY가 설정되지 않았습니다." } }); return; }
  const claim = await prisma.report.updateMany({ where: { id: reportId, status: { in: ["PENDING", "FAILED"] } }, data: { status: "GENERATING", lastError: null } });
  if (claim.count === 0) return;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45_000, maxRetries: 0 });
  const script = buildReportScript(report.sajuProfile.myeongsik as unknown as Myeongsik, report.sajuProfile.name);
  let lastError = "리포트 생성에 실패했습니다.";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const paragraphs = await Promise.all(script.bits.map(async (bit) => {
        const response = await client.responses.create({
          model: process.env.OPENAI_MODEL || "gpt-4o", store: false, max_output_tokens: 650,
          input: [
            { role: "developer", content: `${REPORT_DEVELOPER_INSTRUCTIONS}\n\n지금은 전체 편지가 아니라 bit ${bit.bitIndex} 하나만 렌더링한다. JSON paragraph 하나만 출력하고 다른 비트 내용은 절대 섞지 않는다.` },
            ...(attempt > 1 ? [{ role: "developer" as const, content: `직전 초안 검증 실패: ${lastError}. 금지 표현 없이 대본 사실과 현실 장면을 모두 살려 다시 작성하세요.` }] : []),
            { role: "user", content: JSON.stringify({ user_name: script.userName, target_year: script.targetYear, script_bit: bit }) },
          ],
          text: { format: { type: "json_schema", name: "essay_bit", strict: true, schema: bitOutputSchema } },
        });
        return bitSchema.parse(JSON.parse(response.output_text)).paragraph.trim();
      }));
      const content = validateReport(paragraphs, script);
      await prisma.report.update({ where: { id: reportId }, data: { status: "COMPLETED", content: content as unknown as Prisma.InputJsonValue, retryCount: attempt - 1, completedAt: new Date(), lastError: null } });
      return;
    } catch (error) { lastError = error instanceof Error ? error.message : "알 수 없는 생성 오류"; await prisma.report.update({ where: { id: reportId }, data: { retryCount: attempt, lastError } }); }
  }
  await prisma.report.update({ where: { id: reportId }, data: { status: "FAILED", lastError } });
}
