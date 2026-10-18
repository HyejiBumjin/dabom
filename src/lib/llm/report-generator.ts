import OpenAI from "openai";
import { formatReportEmoticons, REPORT_EMOTICON_INSTRUCTIONS, stripReportDecorations } from "@/lib/report-emoticons";
import { z } from "zod";
import { firebaseStore } from "@/lib/firebase/store";
import { requireReportEntitlement } from "@/lib/portone/entitlement";
import { buildReportEvidencePrompt, getReportPrompt, getStoredReportTone } from "@/lib/prompts/v6";
import { buildReportRenderPayload, type ReportTone } from "@/lib/saju/report-payload";
import type { Myeongsik } from "@/lib/saju/myeongsik";
import type { ReportContent } from "./types";
import { DEFAULT_REPORT_TONE, getConfiguredReportModel, getReportModelOptions } from "./report-config";
import { ANNUAL_OPENING, containsReaderName, countReportCharacters, FORMAL_REPORT_ENDING, hasInlineTermExplanation, hasReportTerm, normalizeReportParagraph, redactReaderName, repairRepeatedAnnualOpenings, REPORT_PARAGRAPH_LENGTHS, SUGGESTION_ENDING } from "./report-rules";

const sectionSchema = z.object({
  section_id: z.string(),
  paragraph: z.preprocess((value) => typeof value === "string" ? normalizeReportParagraph(value) : value, z.string()),
});
const reportSchema = z.object({ sections: z.array(sectionSchema).length(6) });
type RenderedReport = z.infer<typeof reportSchema>;
const MIN_PARAGRAPH_LENGTH = Math.min(...Object.values(REPORT_PARAGRAPH_LENGTHS).map((range) => range.min));
const MAX_PARAGRAPH_LENGTH = Math.max(...Object.values(REPORT_PARAGRAPH_LENGTHS).map((range) => range.max));
const MAX_RENDER_ATTEMPTS = 5;
const MAX_STYLE_REPAIR_FAILURES = 2;
// Leave time for persistence within the API route's 55-second budget.
const MAX_RENDER_TIME_MS = 45_000;

function buildOutputSchema(sectionIds: string[]) {
  return {
    type: "object", additionalProperties: false, required: ["sections"], properties: {
      sections: {
        type: "array", minItems: sectionIds.length, maxItems: sectionIds.length,
        items: {
          type: "object", additionalProperties: false, required: ["section_id", "paragraph"], properties: {
            section_id: { type: "string", enum: sectionIds },
            // Give the model room to finish a sentence, including message
            // breaks and emoji. Per-section prose limits are validated below.
            paragraph: { type: "string", minLength: MIN_PARAGRAPH_LENGTH, maxLength: MAX_PARAGRAPH_LENGTH * 2 },
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
      const technicalTerms = expected.flatMap((entry) => [...entry.required_factual_terms, ...entry.required_factual_groups.flat()]);
      if (technicalTerms.some((term) => hasReportTerm(paragraph, term))) style(context.payload.style.tone === "genz"
        ? "마무리에서 명리 용어를 다시 설명하지 마세요. 본문에서 확인된 올해의 흐름을 생활 언어로 요약하고 응원을 전하세요."
        : "마무리에서 명리 용어를 다시 설명하지 마세요. 앞서 설명한 부담을 이해하는 짧은 응원만 남기세요.");
      if (context.payload.style.tone === "genz") {
        const messages = paragraph.split(/\n\s*\n/u).filter(Boolean);
        const firstMessage = messages[0] ?? "";
        const yearTerms = ["올해", "이번 해", "한 해", `${context.reportFacts.targetYear}년`];
        const sentences = firstMessage.split(/[.!?。！？]/u).filter(part => countReportCharacters(part) > 0);
        if (!yearTerms.some(term => firstMessage.includes(term)) || sentences.length !== 1) style("첫 마무리 메시지는 본문에서 확인된 올해의 종합 운세를 한 문장으로 요약하세요. 시간 표현은 문장 중간에 자연스럽게 넣으세요.");
        if (messages.length < 3 || countReportCharacters(messages.at(-1) ?? "") < 40) style("올해 운세 한 문장 뒤에 해석에 맞는 긍정의 메시지와 따뜻한 인사를 빈 줄로 나눠 보내세요. 마지막 인사는 약 50~90자로 마음을 충분히 전하세요.");
      }
    }
    const firstSentence = paragraph.split(/[.!?。！？]/u)[0];
    const technicalTerms = [...new Set(expected.flatMap((entry) => [...entry.required_factual_terms, ...entry.required_factual_groups.flat()]).concat(["충", "합"]))];
    if (technicalTerms.some((term) => hasReportTerm(firstSentence, term))) style("첫 문장에 명리 용어가 있습니다. 먼저 체감할 의미를 설명하고 용어는 두 번째 문장 이후에 넣으세요.");
    const missingTimingTerms = expectedSection.required_timing_terms.filter((term) => !paragraph.includes(term));
    if (missingTimingTerms.length > 0) fail(`올해 월운 시점이 빠졌습니다: ${missingTimingTerms.join(", ")}. 이미 지난 달도 계산상 과거 시점으로 짧게 포함하세요.`);
    if (expectedSection.prohibited_terms.some((term) => paragraph.includes(term))) style("다른 문단 전용 시점이 반복되었습니다.");
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
          message: `${expected[index].id}: 전문 용어 '${term}'의 첫 등장에 짧은 풀이가 빠졌습니다. terminology의 의미를 같은 메시지 안에서 용어 바로 뒤 괄호나 짧은 말로 풀어 주세요. 이후 같은 용어의 풀이는 반복하지 마세요.`,
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
      charCount: [...text].length,
      beats: context.selected.sections.map((section) => `${section.id}:${section.fragments.map((fragment) => fragment.id).join(",")}`),
      termsUsed: context.payload.terminology.filter(({ term }) => paragraphs.some(paragraph => hasReportTerm(paragraph, term))).map(({ term, meaning }) => ({ term, gloss: meaning })),
    },
  };
}

/** Facts and approved corpus selection stay outside the LLM. */
export async function generateReport(reportId: string, options: { tone?: ReportTone; model?: string } = {}): Promise<void> {
  const deadline = Date.now() + MAX_RENDER_TIME_MS;
  const report = await firebaseStore.getReportWithAccess(reportId);
  if (!report || report.status === "COMPLETED") return;
  // Check the provider immediately before claiming work, including non-HTTP callers.
  await requireReportEntitlement(report, report.userId, "generate");
  const storedTone = getStoredReportTone(report.promptVersion);
  const prompt = getReportPrompt(options.tone ?? DEFAULT_REPORT_TONE);
  // Resume a current-version report with its chosen model. Older unfinished
  // reports switch to the approved defaults and don't reuse a different voice.
  const model = options.model ?? (report.promptVersion === prompt.version ? report.model || getConfiguredReportModel() : getConfiguredReportModel());
  const claim = await firebaseStore.claimReport(reportId, { lastError: null, retryCount: 0, completedAt: null, promptVersion: prompt.version, model }, report.userId);
  if (!claim) return;

  try {
    const context = buildReportRenderPayload(report.sajuProfile.myeongsik as unknown as Myeongsik, prompt.tone);
    // The name is used only by local validation and draft redaction, never as
    // interpretation evidence sent to the model.
    const readerName = report.sajuProfile.name;
    const allSectionIds = context.payload.sections.map((section) => section.id);
    let lastError = "리포트 생성에 실패했습니다.";
    let attemptsUsed = 0;
    let styleRepairFailures = 0;
    const recovery: { best: { content: ReportContent; styleIssueCount: number } | null } = { best: null };
    const complete = async (content: ReportContent) => {
      await firebaseStore.updateReport(reportId, claim, { status: "COMPLETED", content: content, retryCount: Math.max(0, attemptsUsed - 1), completedAt: new Date(), lastError: null });
    };
    const previousContent = z.object({ paragraphs: z.array(z.string()).length(6) }).safeParse(storedTone === prompt.tone ? report.content : null);
    let draft: RenderedReport | null = previousContent.success
      ? { sections: previousContent.data.paragraphs.map((paragraph, index) => ({ section_id: allSectionIds[index], paragraph: normalizeReportParagraph(paragraph) })) }
      : null;
    const repairOpenings = () => {
      if (!draft) return;
      const repaired = repairRepeatedAnnualOpenings(draft.sections.map(section => section.paragraph), context.payload.sections.map(section => section.required_year_terms), context.reportFacts.targetYear);
      draft = { sections: draft.sections.map((section, index) => ({ ...section, paragraph: repaired[index] })) };
    };
    const preserveUsableDraft = async (error: ReportValidationError) => {
      if (!draft || !error.styleOnly) return;
      const content = validateReport(draft, context, readerName, true);
      if (!recovery.best || error.issues.length < recovery.best.styleIssueCount) {
        recovery.best = { content, styleIssueCount: error.issues.length };
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
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 50_000, maxRetries: 0 });

    for (let attempt = 1; attempt <= MAX_RENDER_ATTEMPTS; attempt += 1) {
      const remainingTime = deadline - Date.now();
      if (remainingTime < 1_000) {
        lastError = "리포트 준비 시간이 초과되었습니다. 다시 시도해 주세요.";
        break;
      }
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
        }));
        const repairTone = prompt.tone === "genz" ? REPORT_EMOTICON_INSTRUCTIONS + "\n수정 문단도 젠지 찐친의 말투를 유지하세요. '~다·~한다·~된다·~이다'로 끝내지 말고 '~해·~거든·~네·~지·~잖아'로 직접 말 건네세요. 한 메시지에 1~2문장, 약 50~100자로 끊고 빈 줄로 다음 메시지를 이어 주세요. 특수문자 이모티콘만 쓰고 컬러 이모지는 빼세요. 전체 리포트의 3~5개 기준에는 이번에 수정하지 않는 메시지의 표정도 포함됩니다. 전문 용어가 처음 나오면 terminology에 근거한 짧은 풀이를 용어 바로 뒤에 붙이세요. 다른 메시지로 풀이를 미루거나 이미 설명한 용어를 재정의하지 마세요. 해석에서 나온 장난스러운 비유·팩폭을 살리고, 분량을 채우려고 진지한 상담문이나 훈계로 바꾸지 마세요." : "";
        const repairClosing = prompt.tone === "genz"
          ? "마무리는 summary의 editorial_focus에 맞춰 첫 메시지에 올해 종합 운세를 한 문장으로 요약하고, 해석에 맞는 긍정의 메시지와 약 50~90자의 따뜻한 인사로 마칩니다. 요약은 이미 본문에서 설명한 올해의 의미만 압축하며 새 판단을 만들지 않습니다."
          : "마무리는 짧은 응원입니다.";
        const closingReminder = prompt.tone === "genz"
          ? "summary의 한 문장 요약 뒤에는 본문의 상세 설명과 행동 지시를 반복하지 마세요."
          : "summary에서 요점과 행동 지시를 반복하지 마세요.";
        const response: OpenAI.Responses.Response = await client.responses.create({
          model, store: false, ...getReportModelOptions(model),
          input: [
            { role: "developer", content: prompt.instructions },
            { role: "user", content: buildReportEvidencePrompt(context.payload) },
            ...(draft ? [{ role: "assistant" as const, content: JSON.stringify({ sections: draft.sections.map((section) => ({ ...section, paragraph: redactReaderName(section.paragraph, readerName) })) }) }] : []),
            ...(draft || attempt > 1 ? [{ role: "developer" as const, content: `직전 출력 검증 실패:\n${lastError}\n직전 문단별 글자 수와 수정량: ${previousLengths || "출력 없음"}. 직전 assistant 출력은 수정 대상이며 사주 사실의 근거가 아닙니다. 이번 요청은 부분 수정입니다. 출력 sections에는 ${requestedIds.join(", ")}만 이 순서로 넣으세요. 최초의 6개 문단 출력 지시보다 이 부분 수정 지시를 우선하세요. 나머지 문단은 코드가 보존하므로 출력하지 마세요. 이번 수정의 필수 조건:\n${JSON.stringify(repairRequirements)}\nmust_include_one_of는 배열 중 하나, must_include_one_from_each_group은 각 그룹에서 하나씩 그 표기 그대로 쓰라는 뜻입니다. 첫 문장에는 명리 용어를 넣지 말고 두 번째 문장 이후에 필요한 용어를 모두 포함하세요. 각 수정 문단의 paragraph_length.target에 맞추고, 부족하면 배정된 해석의 아직 설명하지 않은 이유나 선택의 차이를 더 설명하세요. 반복·공백으로 분량을 채우지 마세요. 도입은 성향과 올해 요점, 본문은 올해 운세의 서로 다른 측면, ${repairClosing} '해보자·하자·해봐' 같은 권유형은 쓰지 마세요. 월별 시점은 relation에서만 다루고 ${closingReminder}${repairTone}` }] : []),
          ],
          text: { format: { type: "json_schema", name: "saju_corpus_report", strict: true, schema: buildOutputSchema(requestedIds) } },
        }, { timeout: remainingTime });
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
        await complete(content);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "알 수 없는 생성 오류";
        if (error instanceof ReportValidationError) {
          await preserveUsableDraft(error);
          if (error.styleOnly) styleRepairFailures += 1;
        }
        const invalidIds = error instanceof ReportValidationError ? error.sectionIds : allSectionIds;
        requestedIds = draft ? allSectionIds.filter((id) => invalidIds.includes(id)) : allSectionIds;
        await firebaseStore.updateReport(reportId, claim, { retryCount: attempt, lastError });
        if (recovery.best && (styleRepairFailures >= MAX_STYLE_REPAIR_FAILURES || !(error instanceof ReportValidationError) || !error.styleOnly)) break;
      }
    }
    if (recovery.best) {
      console.warn("[Report] Published content-validated draft after editorial repair limit", { reportId, styleIssueCount: recovery.best.styleIssueCount, attemptsUsed });
      await complete(recovery.best.content);
      return;
    }
    await firebaseStore.updateReport(reportId, claim, { status: "FAILED", lastError });
  } catch (error) {
    const lastError = error instanceof Error ? error.message : "알 수 없는 생성 오류";
    console.error("[Report] Generation failed", { reportId });
    await firebaseStore.updateReport(reportId, claim, { status: "FAILED", lastError });
  }
}
