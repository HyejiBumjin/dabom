import OpenAI from "openai";
import { formatReportEmoticons, stripReportDecorations } from "@/lib/report-emoticons";
import { z } from "zod";
import { firebaseStore } from "@/lib/firebase/store";
import { requireReportEntitlement } from "@/lib/portone/entitlement";
import { assertProfileUse } from "@/lib/saju/profile-age";
import { buildReportEvidencePrompt, getReportPrompt } from "@/lib/prompts/v6";
import { buildReportRenderPayload, type ReportTone } from "@/lib/saju/report-payload";
import type { Myeongsik } from "@/lib/saju/myeongsik";
import type { ReportContent } from "./types";
import { DEFAULT_REPORT_TONE, getConfiguredReportModel, getReportModelOptions } from "./report-config";
import { getAdvancedReportIssues } from "./advanced-report-rules";
import { getAdviceDensityIssues, getClosingTimelineIssues, getTopicCoverageIssues, hasNearDuplicateExplanation } from "./report-topic-rules";
import { editorialPenalty, evidenceUseIssues, getSpecificityIssues, repairEvidenceExcerpts } from "./report-evidence-review";
import { REPORT_MIN_ATTEMPT_MS, REPORT_RENDER_BUDGET_MS, type ReportGenerationDiagnostics } from "./report-runtime-policy";
import { ANNUAL_OPENING, containsReaderName, countReportCharacters, FORMAL_REPORT_ENDING, getReportReadabilityIssues, getUnexpectedReportCharacters, hasInlineTermExplanation, hasReportTerm, hasReportTimingTerm, normalizeReportParagraph, redactReaderName, repairRepeatedAnnualOpenings, REPORT_PARAGRAPH_LENGTHS, SUGGESTION_ENDING } from "./report-rules";

const evidenceUseSchema = z.object({ evidence_id: z.string().min(1), excerpt: z.string().min(8).max(240) });
const sectionSchema = z.object({
  section_id: z.string(),
  paragraph: z.preprocess((value) => typeof value === "string" ? normalizeReportParagraph(value) : value, z.string()),
  evidence_uses: z.array(evidenceUseSchema).max(3),
});
const reportSchema = z.object({ sections: z.array(sectionSchema).length(6) });
const checkpointSchema = z.object({ promptVersion: z.string(), model: z.string(), readingAsOf: z.iso.datetime(), draft: reportSchema });
type RenderedReport = z.infer<typeof reportSchema>;
const MIN_PARAGRAPH_LENGTH = Math.min(...Object.values(REPORT_PARAGRAPH_LENGTHS).map((range) => range.min));
const MAX_PARAGRAPH_LENGTH = Math.max(...Object.values(REPORT_PARAGRAPH_LENGTHS).map((range) => range.max));
const MAX_RENDER_ATTEMPTS = 5;
const MAX_STYLE_REPAIR_FAILURES = 2;

function readCheckpoint(value: string | null | undefined) {
  try { return checkpointSchema.safeParse(JSON.parse(value ?? "null")); }
  catch { return checkpointSchema.safeParse(null); }
}

class IncompleteReportResponseError extends Error {}

function responseFailure(response: OpenAI.Responses.Response): string | null {
  if (response.status === "incomplete") return `모델 응답 미완료: ${response.incomplete_details?.reason ?? "unknown"}.`;
  if (response.status && response.status !== "completed") return `모델 응답 상태: ${response.status}.`;
  if (response.output?.some(item => item.type === "message" && item.content.some(part => part.type === "refusal"))) return "모델이 리포트 작성을 거절했습니다.";
  if (!response.output_text?.trim()) return "모델이 빈 응답을 반환했습니다.";
  return null;
}

function buildOutputSchema(sectionIds: string[]) {
  return {
    type: "object", additionalProperties: false, required: ["sections"], properties: {
      sections: {
        type: "array", minItems: sectionIds.length, maxItems: sectionIds.length,
        items: {
          type: "object", additionalProperties: false, required: ["section_id", "paragraph", "evidence_uses"], properties: {
            section_id: { type: "string", enum: sectionIds },
            // Give the model room to finish a sentence, including message
            // breaks and emoji. Per-section prose limits are validated below.
            paragraph: { type: "string", minLength: MIN_PARAGRAPH_LENGTH, maxLength: MAX_PARAGRAPH_LENGTH * 2 },
            evidence_uses: { type: "array", maxItems: 3, items: {
              type: "object", additionalProperties: false, required: ["evidence_id", "excerpt"], properties: {
                evidence_id: { type: "string" }, excerpt: { type: "string", minLength: 8, maxLength: 240 },
              },
            } },
          },
        },
      },
    },
  } as const;
}

interface ValidationIssue { sectionId: string; message: string; severity: "blocking" | "style" }

class ReportValidationError extends Error {
  readonly sectionIds: string[];
  readonly styleOnly: boolean;
  constructor(readonly issues: ValidationIssue[]) {
    super(issues.map(issue => issue.message).join("\n"));
    this.sectionIds = [...new Set(issues.map(issue => issue.sectionId))];
    this.styleOnly = issues.every(issue => issue.severity === "style");
  }
}

const genericCheerleading = /화이팅|충분히\s*잘|네가\s*할\s*수\s*있|넌\s*할\s*수\s*있|성공은\s*차곡차곡|멋진\s*한\s*해|다잘지냈어/u;

export function validateReport(raw: unknown, context: ReturnType<typeof buildReportRenderPayload>, readerName: string, allowStyleIssues = false): ReportContent {
  const rendered = reportSchema.parse(raw);
  const expected = context.payload.sections;
  const issues: ValidationIssue[] = [];
  const seenSentences = new Set<string>();
  const bodyExplanations: string[] = [];
  const explainedTerms = new Set<string>();
  let hasAnnualOpening = false;
  const paragraphs = rendered.sections.map((section, index) => {
    const expectedSection = expected[index];
    const paragraph = section.paragraph;
    const fail = (message: string, severity: ValidationIssue["severity"] = "blocking") => {
      if (allowStyleIssues && severity === "style") return;
      issues.push({ sectionId: expectedSection.id, message: `${expectedSection.id}: ${message}`, severity });
    };
    const style = (message: string) => fail(message, "style");
    // Grounding failures must never pass the style-only recovery path.
    for (const issue of evidenceUseIssues(expectedSection, paragraph, section.evidence_uses, context.payload)) fail(issue);
    for (const issue of getAdvancedReportIssues(paragraph, expectedSection.advanced_terms)) fail(issue);
    const unexpectedCharacters = getUnexpectedReportCharacters(paragraph);
    if (unexpectedCharacters.length > 0) fail(`한국어 문장에 다른 언어 또는 깨진 문자가 섞였습니다: ${unexpectedCharacters.join(", ")}. 허용된 표정은 유지하고, 잘못된 단어가 있는 문장을 앞뒤 뜻에 맞는 자연스러운 한국어로 고치세요. 문자만 삭제해서 뜻을 비우지 마세요.`);
    for (const issue of getReportReadabilityIssues(paragraph)) style(issue);
    for (const issue of getTopicCoverageIssues(expectedSection.id, paragraph)) style(issue);
    for (const issue of getAdviceDensityIssues(expectedSection.id, paragraph)) style(issue);
    for (const issue of getSpecificityIssues(expectedSection.id, paragraph)) style(issue);
    if (["yearly", "relation", "career", "mental"].includes(expectedSection.id)) {
      if (bodyExplanations.some(previous => hasNearDuplicateExplanation(previous, paragraph))) style("다른 본문과 긴 설명이 거의 같습니다. 이 메시지의 content_contract와 배정된 근거로 아직 말하지 않은 별개의 흐름을 설명하세요. 표현만 바꾸어 같은 결론을 재사용하지 마세요.");
      bodyExplanations.push(paragraph);
    }
    const length = countReportCharacters(paragraph);
    const range = expectedSection.paragraph_length;
    // Small editorial deviations can be repaired or published. Empty, partial,
    // and excessively long paragraphs still fail the content gate.
    if (length < Math.max(60, range.min - 40) || length > range.max * 2) fail("문단이 불완전하거나 정상적인 리포트 분량을 크게 벗어났습니다.");
    if (length < range.min || length > range.max) style(`문단 분량 ${length}자 (권장 ${range.min}~${range.max}자, 목표 ${range.target}자).`);
    if (section.section_id !== expectedSection.id) fail(`문단 순서가 맞지 않습니다: ${section.section_id}.`);
    if (containsReaderName(paragraph, readerName)) fail("독자의 이름이 본문에 포함되었습니다. 이름과 이름을 줄인 호칭을 빼고, 호칭이 필요하면 '너'를 쓰세요.");
    if (ANNUAL_OPENING.test(paragraph)) {
      if (hasAnnualOpening) style("올해·이번 해·연도로 시작하는 문단이 반복되었습니다. 이 문단은 배정된 주제의 의미로 시작하고 시간 표현은 필요할 때 문장 중간에 넣으세요.");
      hasAnnualOpening = true;
    }
    if (expectedSection.required_factual_terms.length > 0 && !expectedSection.required_factual_terms.some((term) => hasReportTerm(paragraph, term))) fail(`필수 사주 근거가 빠졌습니다. 다음 용어 중 하나를 명리 용어로 그대로 포함하세요: ${expectedSection.required_factual_terms.join(", ")}.`);
    for (const group of expectedSection.required_factual_groups) {
      if (!group.some((term) => hasReportTerm(paragraph, term))) fail(`성향 또는 올해 운세 근거가 빠졌습니다: ${group.join(", ")}.`);
    }
    if (expectedSection.required_year_terms.length > 0 && !expectedSection.required_year_terms.some((term) => paragraph.includes(term))) fail(`올해 운세로 연결되지 않았습니다. ${expectedSection.required_year_terms.join(" 또는 ")}를 포함하세요.`);
    if (expectedSection.id === "essence" && /[?？]/u.test(paragraph)) style("도입은 나의 성향과 올해 요점을 알려 주는 글입니다. 독자에게 대답을 묻는 질문을 빼고 서술하세요.");
    if (expectedSection.id === "summary") {
      const yearEnd = context.reportFacts.monthlyCalendar.at(-1)?.endAt;
      const yearFinished = Boolean(yearEnd && Date.parse(context.payload.as_of.instant) >= Date.parse(yearEnd));
      for (const issue of getClosingTimelineIssues(paragraph, yearFinished)) style(issue);
      const technicalTerms = expected.flatMap((entry) => [...entry.required_factual_terms, ...entry.required_factual_groups.flat()]);
      if (technicalTerms.some((term) => hasReportTerm(paragraph, term))) style(context.payload.style.tone === "genz"
        ? "마무리에서 명리 용어를 다시 설명하지 마세요. 본문에서 확인된 올해의 흐름을 생활 언어로 요약하고 응원을 전하세요."
        : "마무리에서 명리 용어를 다시 설명하지 마세요. 앞서 설명한 부담을 이해하는 짧은 응원만 남기세요.");
      if (context.payload.style.tone === "genz") {
        const messages = paragraph.split(/\n\s*\n/u).filter(Boolean);
        const firstMessage = messages[0] ?? "";
        const yearTerms = ["올해", "이번 해", "한 해", `${context.reportFacts.targetYear}년`];
        const sentences = firstMessage.split(/[.!?。！？]/u).filter(part => countReportCharacters(part) > 0);
        if (!yearTerms.some(term => firstMessage.includes(term)) || sentences.length !== 1) style("마무리 메시지의 첫 단락은 본문에서 확인된 올해의 종합 운세를 한 문장으로 요약하세요. 시간 표현은 문장 중간에 자연스럽게 넣으세요.");
        if (messages.length < 2 || countReportCharacters(messages.at(-1) ?? "") < 40) style("하나의 마무리 메시지 안에서 올해 운세 한 문장, 해석에 맞는 응원, 따뜻한 인사를 빈 줄로 구분하세요. 마지막 인사는 약 50~90자로 마음을 충분히 전하세요.");
      }
    }
    const firstSentence = paragraph.split(/[.!?。！？]/u)[0];
    const technicalTerms = [...new Set(expected.flatMap((entry) => [...entry.required_factual_terms, ...entry.required_factual_groups.flat()]).concat(context.payload.terminology.map(entry => entry.term), ["충", "합"]))];
    if (technicalTerms.some((term) => hasReportTerm(firstSentence, term) && !hasInlineTermExplanation(firstSentence, term))) style("첫 문장에서 명리 용어가 풀이보다 먼저 나옵니다. 체감할 의미를 일상어로 충분히 설명한 뒤 해당 용어만 괄호로 붙이세요. 풀이 뒤의 괄호 용어는 첫 문장에도 쓸 수 있습니다.");
    const missingTimingTerms = expectedSection.required_timing_terms.filter((term) => !hasReportTimingTerm(paragraph, term, context.reportFacts.targetYear));
    if (missingTimingTerms.length > 0) fail(`선정된 월운 시점이 빠졌습니다: ${missingTimingTerms.join(", ")}. 각 기간의 phase에 맞게 설명하고 선정되지 않은 과거 달로 바꾸지 마세요.`);
    if (expectedSection.prohibited_terms.some((term) => hasReportTimingTerm(paragraph, term, context.reportFacts.targetYear))) style("다른 문단 전용 시점이 반복되었습니다.");
    if (/\[[^\]]+\]/u.test(paragraph)) fail("내부 추적 태그가 본문에 노출되었습니다.");
    if (/(?:^|\s)#\s*(?:required|mechanism|translation|concrete\s*scene|yearly\s*[-:]|scene\s*terms?|factual\s*terms?)/imu.test(paragraph)) fail("내부 입력 라벨이 본문에 노출되었습니다.");
    if (genericCheerleading.test(paragraph)) style("근거 없는 치어리딩 문구가 포함되었습니다.");
    if (SUGGESTION_ENDING.test(paragraph)) style("'해보자·하자·해봐' 같은 권유형이 포함되었습니다. 행동 지시 대신 그 선택이 올해 어떤 의미인지 설명하세요.");
    if (context.payload.style.tone === "genz" && FORMAL_REPORT_ENDING.test(stripReportDecorations(paragraph))) style("'~한다·~된다·~이다·~다'로 끝나는 서술체가 있습니다. 친구에게 보내는 긴 메시지처럼 '~해·~거든·~네·~지·~잖아'로 바꾸고, 자연스러운 줄바꿈과 특수문자 이모티콘을 유지하세요.");
    const evasivePhrase = paragraph.match(/(?:일|였을|었을|느꼈을)\s*거야|것\s*같아|듯해|필요해\s*보여|뜻은 아니야|비춰 볼 수 있어|살펴볼 수 있어|할 수는 없어/u)?.[0];
    if (evasivePhrase) style(`말을 흐리는 표현 '${evasivePhrase}'이 있습니다. 조건과 시간 범위를 분명히 한 뒤 해당 해석을 따뜻한 서술형으로 쓰세요.`);
    const hanja = paragraph.match(/\p{Script=Han}/gu);
    if (hanja) fail(`한자가 본문에 노출되었습니다: ${[...new Set(hanja)].join(", ")}. 이 한자와 괄호 병기는 전부 지우고 한국어 용어만 남기세요.`);
    if (/절기 기준|원국 [일월년시]지/u.test(paragraph)) fail("내부 계산 용어가 본문에 노출되었습니다. 사용자에게 읽히는 생활 언어로 바꾸세요.");
    if (/광고|외부 공유|삼성 광고|이하에|200자를 넘지/u.test(paragraph)) fail("비정상 렌더링 문구가 포함되었습니다.");
    for (const sentence of paragraph.split(/[.!?。！？]/u)) {
      const comparable = sentence.replace(/[\s'"‘’“”,]/gu, "");
      if (comparable.length < 20) continue;
      if (seenSentences.has(comparable)) style("같은 설명 문장이 반복되었습니다. 이 문단의 editorial_focus에 해당하는 새 설명만 남기세요.");
      seenSentences.add(comparable);
    }
    return paragraph;
  });
  // Fix missing facts first. Their repair can restore an earlier term mention;
  // checking later glosses before that would rewrite unrelated sections.
  if (context.payload.style.tone === "genz" && !allowStyleIssues && !issues.some(issue => issue.severity === "blocking")) {
    paragraphs.forEach((paragraph, index) => {
      for (const { term } of context.payload.terminology) {
        if (!hasReportTerm(paragraph, term) || explainedTerms.has(term)) continue;
        explainedTerms.add(term);
        if (!hasInlineTermExplanation(paragraph, term)) issues.push({
          sectionId: expected[index].id,
          severity: "style",
          message: `${expected[index].id}: 전문 용어 '${term}'의 첫 등장에 풀이가 먼저 오지 않았습니다. terminology의 뜻을 같은 문장 안에서 일상어로 충분히 설명하고 그 바로 뒤에 (${term})만 붙이세요. 용어(뜻풀이) 순서나 표정만 붙인 표기는 피하고, 이후 같은 용어의 풀이는 반복하지 마세요.`,
        });
      }
    });
  }
  if (issues.length > 0) throw new ReportValidationError(issues);
  const formatted = context.payload.style.tone === "genz" ? formatReportEmoticons(paragraphs) : paragraphs;
  const text = formatted.join("\n\n");
  return {
    paragraphs: formatted,
    meta: {
      presentation: context.payload.style.tone === "genz" ? "message" : "letter",
      synthesisRuleVersion: context.payload.synthesis_context.rule_version,
      synthesisEvidenceIds: context.payload.synthesis_context.evidence_ids,
      interpretationRuleVersion: context.payload.advanced_context.rule_version,
      interpretationEvidenceIds: context.payload.advanced_context.evidence_ids,
      readingAsOf: context.payload.as_of.instant,
      charCount: [...text].length,
      beats: rendered.sections.map(section => `${section.section_id}:${section.evidence_uses.map(use => use.evidence_id).join(",")}`),
      termsUsed: context.payload.terminology.filter(({ term }) => paragraphs.some(paragraph => hasReportTerm(paragraph, term))).map(({ term, meaning }) => ({ term, gloss: meaning })),
      readingPlanVersion: context.payload.reading_plan_version,
      evidenceUses: rendered.sections.map(section => ({ sectionId: section.section_id, uses: section.evidence_uses })),
      editorialReview: { status: "passed", issueCount: 0, specificityIssueCount: 0 },
    },
  };
}

/** Calculation stays in code; the LLM writes interpretations from observations. */
export async function generateReport(reportId: string, options: { tone?: ReportTone; model?: string } = {}): Promise<void> {
  const startedAt = Date.now();
  const deadline = startedAt + REPORT_RENDER_BUDGET_MS;
  const report = await firebaseStore.getReportWithAccess(reportId);
  if (!report || report.status === "COMPLETED") return;
  assertProfileUse(report.sajuProfile);
  // Check the provider immediately before claiming work, including non-HTTP callers.
  await requireReportEntitlement(report, report.userId, "generate");
  const prompt = getReportPrompt(options.tone ?? DEFAULT_REPORT_TONE);
  // Resume a current-version report with its chosen model. Older unfinished
  // reports switch to the approved defaults and don't reuse a different voice.
  const model = options.model ?? (report.promptVersion === prompt.version ? report.model || getConfiguredReportModel() : getConfiguredReportModel());
  const claim = await firebaseStore.claimReport(reportId, { lastError: null, retryCount: 0, completedAt: null, promptVersion: prompt.version, model }, report.userId);
  if (!claim) return;

  try {
    // Resuming a validated draft must keep its month selection across midnight
    // or a solar-term boundary. A new prompt starts a new reading snapshot.
    const canResumeDraft = report.promptVersion === prompt.version && report.model === model;
    const checkpoint = readCheckpoint(canResumeDraft ? report.renderCheckpointJson : null);
    const resumableCheckpoint = checkpoint.success && checkpoint.data.promptVersion === prompt.version && checkpoint.data.model === model ? checkpoint.data : null;
    const priorSnapshot = z.object({ meta: z.object({ readingAsOf: z.iso.datetime() }) }).safeParse(canResumeDraft ? report.content : null);
    const readingAsOf = new Date(resumableCheckpoint?.readingAsOf ?? (priorSnapshot.success ? priorSnapshot.data.meta.readingAsOf : Date.now()));
    const context = buildReportRenderPayload(report.sajuProfile.myeongsik as unknown as Myeongsik, prompt.tone, readingAsOf);
    // The name is used only by local validation and draft redaction, never as
    // interpretation evidence sent to the model.
    const readerName = report.sajuProfile.name;
    const allSectionIds = context.payload.sections.map((section) => section.id);
    let lastError = "리포트 생성에 실패했습니다.";
    let attemptsUsed = 0;
    let styleRepairFailures = 0;
    const diagnostics: ReportGenerationDiagnostics = { elapsedMs: 0, stopReason: "attempt-limit", attempts: [] };
    const currentDiagnostics = () => ({ ...diagnostics, elapsedMs: Math.max(0, Date.now() - startedAt) });
    const recovery: { best: { content: ReportContent; styleIssueCount: number; penalty: number } | null } = { best: null };
    const complete = async (content: ReportContent) => {
      diagnostics.stopReason = "completed";
      await firebaseStore.updateReport(reportId, claim, { status: "COMPLETED", content: content, retryCount: Math.max(0, attemptsUsed - 1), completedAt: new Date(), lastError: null, renderCheckpointJson: null, generationDiagnostics: currentDiagnostics() });
    };
    // Updated evidence/date policies must not inherit an older unfinished draft.
    // Completed reports returned above remain unchanged.
    const previousContent = z.object({ paragraphs: z.array(z.string()).length(6), meta: z.object({
      evidenceUses: z.array(z.object({ sectionId: z.string(), uses: z.array(evidenceUseSchema).max(3) })).length(6),
    }) }).safeParse(canResumeDraft ? report.content : null);
    // A checkpoint is private work in progress, never publishable content. It
    // passes the complete validator again before display or any API repair.
    let draft: RenderedReport | null = previousContent.success
      ? { sections: previousContent.data.paragraphs.map((paragraph, index) => ({ section_id: allSectionIds[index], paragraph: normalizeReportParagraph(paragraph), evidence_uses: previousContent.data.meta.evidenceUses.find(item => item.sectionId === allSectionIds[index])?.uses ?? [] })) }
      : resumableCheckpoint?.draft ?? null;
    const checkpointJson = () => draft ? JSON.stringify({ promptVersion: prompt.version, model, readingAsOf: readingAsOf.toISOString(), draft }) : null;
    const repairOpenings = () => {
      if (!draft) return;
      const repaired = repairRepeatedAnnualOpenings(draft.sections.map(section => section.paragraph), context.payload.sections.map(section => section.required_year_terms), context.reportFacts.targetYear);
      draft = { sections: draft.sections.map((section, index) => {
        if (section.section_id === "summary" && prompt.tone === "genz") {
          // The closing needs its year in the first paragraph, not elsewhere.
          const firstParagraph = repaired[index].split(/\n\s*\n/u)[0];
          if (!["올해", "이번 해", "한 해", `${context.reportFacts.targetYear}년`].some(term => firstParagraph.includes(term))) {
            // Keep the closing's only year marker while varying its opening.
            // This connector changes no evidence and avoids another model call.
            return ANNUAL_OPENING.test(section.paragraph) && repaired[index] !== section.paragraph
              ? { ...section, paragraph: `정리하면, ${section.paragraph}` }
              : section;
          }
        }
        return { ...section, paragraph: repaired[index], evidence_uses: repairEvidenceExcerpts(section.paragraph, repaired[index], section.evidence_uses) };
      }) };
    };
    const preserveUsableDraft = async (error: ReportValidationError) => {
      if (!draft || !error.styleOnly) return;
      const content = validateReport(draft, context, readerName, true);
      const penalty = error.issues.reduce((total, issue) => total + editorialPenalty(issue.message), 0);
      content.meta.editorialReview = { status: "needs-review", issueCount: error.issues.length,
        specificityIssueCount: error.issues.filter(issue => editorialPenalty(issue.message) > 1).length };
      if (!recovery.best || penalty < recovery.best.penalty || (penalty === recovery.best.penalty && error.issues.length < recovery.best.styleIssueCount)) {
        recovery.best = { content, styleIssueCount: error.issues.length, penalty };
        // Keep a complete, content-validated draft before another API request.
        // A failed rewrite must not erase the usable report we already have.
        await firebaseStore.updateReport(reportId, claim, { content: content });
      }
    };
    repairOpenings();
    let requestedIds = allSectionIds;
    if (draft) {
      try {
        await complete(validateReport(draft, context, readerName));
        return;
      } catch (error) {
        if (error instanceof ReportValidationError) {
          lastError = error.message;
          requestedIds = allSectionIds.filter((id) => error.sectionIds.includes(id));
          await preserveUsableDraft(error);
          if (error.styleOnly) styleRepairFailures += 1;
        }
      }
    }

    if (!process.env.OPENAI_API_KEY) {
      if (recovery.best) await complete(recovery.best.content);
      else await firebaseStore.updateReport(reportId, claim, { status: "FAILED", lastError: "OPENAI_API_KEY가 설정되지 않았습니다." });
      return;
    }
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: REPORT_RENDER_BUDGET_MS, maxRetries: 0 });

    for (let attempt = 1; attempt <= MAX_RENDER_ATTEMPTS; attempt += 1) {
      const remainingTime = deadline - Date.now();
      if (remainingTime < REPORT_MIN_ATTEMPT_MS) {
        diagnostics.stopReason = "budget";
        // Preserve the original failure: a deadline is the stopping condition,
        // not an explanation of why a previous draft failed validation.
        lastError = `리포트 준비 시간이 초과되었습니다. 다시 시도해 주세요.\n직전 원인: ${lastError}`;
        break;
      }
      const attemptStartedAt = Date.now();
      const attemptDiagnostic: ReportGenerationDiagnostics["attempts"][number] = { attempt, elapsedMs: 0, outcome: "provider", sections: [...requestedIds] };
      try {
        attemptsUsed = attempt;
        const previousLengths = draft?.sections.map((section) => {
          const length = countReportCharacters(section.paragraph);
          const range = context.payload.sections.find((expectedSection) => expectedSection.id === section.section_id)?.paragraph_length;
          if (!range) return `${section.section_id}: 문단 ID 오류`;
          const revision = length < range.min ? `약 ${range.target - length}자 보강` : length > range.max ? `약 ${length - range.target}자 축약` : "분량 충족";
          return `${section.section_id}: ${length}자 (${revision})`;
        }).join(", ");
        const repairRequirements = context.payload.sections.filter((section) => requestedIds.includes(section.id)).map((section) => ({
          section_id: section.id,
          paragraph_length: section.paragraph_length,
          must_include_one_of: section.required_factual_terms,
          must_include_one_from_each_group: section.required_factual_groups,
          year_terms: section.required_year_terms,
          month_terms: section.required_timing_terms,
          role: section.editorial_focus,
          reading_question: section.reading_question,
          content_contract: section.content_contract,
          primary_evidence_ids: section.primary_evidence_ids,
          context_evidence_ids: section.context_evidence_ids,
          anchor_evidence_ids: section.anchor_evidence_ids,
          reading_plan: section.reading_plan,
        }));
        const response: OpenAI.Responses.Response = await client.responses.create({
          model, store: false, ...getReportModelOptions(model),
          input: [
            { role: "developer", content: prompt.instructions },
            { role: "user", content: buildReportEvidencePrompt(context.payload) },
            ...(draft ? [{ role: "assistant" as const, content: JSON.stringify({ sections: draft.sections.map((section) => ({ ...section, paragraph: redactReaderName(section.paragraph, readerName), evidence_uses: section.evidence_uses.map(use => ({ ...use, excerpt: redactReaderName(use.excerpt, readerName) })) })) }) }] : []),
            ...(draft || attempt > 1 ? [{ role: "developer" as const, content: `직전 출력 검증 실패:
${lastError}
문단별 분량: ${previousLengths || "출력 없음"}. 직전 assistant 출력은 수정 대상이지 계산 사실의 근거가 아닙니다. sections에는 ${requestedIds.join(", ")}만 이 순서로 넣으세요. 최초 여섯 메시지 출력 지시보다 이 부분 수정 지시를 우선합니다. 나머지 메시지는 코드가 보존합니다. 수정 조건:
${JSON.stringify(repairRequirements)}
기존 developer의 말투·근거·시점·마무리 규칙을 유지하세요. 부분 수정이어도 전체 초안과 비교해 같은 결론을 반복하지 마세요. 배정된 관찰을 연결해 아직 설명하지 않은 의미를 쓰고, 분량을 맞추려고 기회와 부담이나 행동 조언을 덧붙이지 마세요. 수정된 근거와 결론이 전체 글의 도입·마무리와도 이어져야 합니다.` }] : []),
          ],
          text: { format: { type: "json_schema", name: "saju_observation_report", strict: true, schema: buildOutputSchema(requestedIds) } },
        }, { timeout: remainingTime });
        attemptDiagnostic.responseStatus = response.status ?? "completed";
        if (response.usage) {
          attemptDiagnostic.inputTokens = response.usage.input_tokens;
          attemptDiagnostic.outputTokens = response.usage.output_tokens;
        }
        const providerFailure = responseFailure(response);
        if (providerFailure) throw new IncompleteReportResponseError(providerFailure);
        const patch = z.object({ sections: z.array(sectionSchema).length(requestedIds.length) }).parse(JSON.parse(response.output_text));
        if (patch.sections.some((section, index) => section.section_id !== requestedIds[index])) throw new ReportValidationError(requestedIds.map(sectionId => ({ sectionId, message: "수정 대상 문단 ID 또는 순서가 맞지 않습니다.", severity: "blocking" })));
        // Preserve valid prose exactly instead of asking the model to reproduce it.
        if (draft) {
          const repairs = new Map(patch.sections.map((section) => [section.section_id, section]));
          draft = { sections: draft.sections.map((section) => repairs.get(section.section_id) ?? section) };
        } else {
          draft = reportSchema.parse(patch);
        }
        repairOpenings();
        const content = validateReport(draft, context, readerName);
        attemptDiagnostic.outcome = "completed";
        attemptDiagnostic.elapsedMs = Math.max(0, Date.now() - attemptStartedAt);
        diagnostics.attempts.push(attemptDiagnostic);
        await complete(content);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "알 수 없는 생성 오류";
        attemptDiagnostic.elapsedMs = Math.max(0, Date.now() - attemptStartedAt);
        attemptDiagnostic.outcome = error instanceof ReportValidationError ? "validation" : error instanceof z.ZodError || error instanceof SyntaxError ? "schema" : "provider";
        if (error instanceof ReportValidationError) attemptDiagnostic.issueCount = error.issues.length;
        if (error instanceof OpenAI.APIError && error.status) attemptDiagnostic.status = error.status;
        diagnostics.attempts.push(attemptDiagnostic);
        // No excerpt, prompt, provider error body or personal data in logs.
        console.warn("[Report] Render attempt failed", { reportId, ...attemptDiagnostic });
        if (error instanceof ReportValidationError) {
          await preserveUsableDraft(error);
          if (error.styleOnly) styleRepairFailures += 1;
        }
        const invalidIds = error instanceof ReportValidationError ? error.sectionIds : allSectionIds;
        requestedIds = draft ? allSectionIds.filter((id) => invalidIds.includes(id)) : allSectionIds;
        await firebaseStore.updateReport(reportId, claim, { retryCount: attempt, lastError, renderCheckpointJson: checkpointJson(), generationDiagnostics: currentDiagnostics() });
        if (recovery.best && (styleRepairFailures >= MAX_STYLE_REPAIR_FAILURES || !(error instanceof ReportValidationError) || !error.styleOnly)) break;
        // Another immediate call cannot fix credentials, quota, an unsupported
        // request or a truncated response at the same token cap. Network failures
        // also wait for an explicit retry instead of consuming five paid calls.
        if (attemptDiagnostic.outcome === "provider") {
          diagnostics.stopReason = "provider";
          break;
        }
      }
    }
    if (recovery.best) {
      console.warn("[Report] Published content-validated draft after editorial repair limit", { reportId, styleIssueCount: recovery.best.styleIssueCount, attemptsUsed });
      await complete(recovery.best.content);
      return;
    }
    await firebaseStore.updateReport(reportId, claim, { status: "FAILED", lastError, renderCheckpointJson: checkpointJson(), generationDiagnostics: currentDiagnostics() });
  } catch (error) {
    const lastError = error instanceof Error ? error.message : "알 수 없는 생성 오류";
    console.error("[Report] Generation failed", { reportId });
    await firebaseStore.updateReport(reportId, claim, { status: "FAILED", lastError });
  }
}
