import { z } from "zod";
import { env } from "@/lib/env";
import type { FortuneInput, FortuneResult } from "./types";
import type { SajuCanonical } from "@/lib/saju/types";
import { generateFortune } from "./engine";

const FIXED_SECTION_TITLES = [
  "내 사주 간략한 오행 분석",
  "올해 전체 운",
  "커리어",
  "연애&결혼",
  "금전",
  "조심할 달",
  "기회가 오는 달",
  "1월~12월 월별 운세",
] as const;
const MIN_SECTION_SENTENCES = 10;
const TARGET_DETAIL_KEYS = [
  "year",
  "month",
  "day",
  "hour",
  "five",
  "hehua",
  "twelve_growth",
  "strength",
  "geokguk",
  "yongshin",
  "branch_relations",
  "relations_ui",
  "sinsal",
  "big_luck",
  "lucky",
] as const;

interface PromptEvidence {
  snapshot: Record<string, unknown>;
  facts: string[];
  anchors: string[];
}

const gptResultSchema = z.object({
  flowType: z.enum(["상승", "변화", "정체", "도전", "회복"]),
  elementalAnalysis: z.string(),
  overall: z.string(),
  career: z.string(),
  love: z.string(),
  money: z.string(),
  cautionMonth: z.string(),
  opportunityMonth: z.string(),
  sections: z.array(
    z.object({
      title: z.string(),
      headline: z.string(),
      content: z.string(),
    })
  ),
});

function buildPrompt(input: FortuneInput, canonical: SajuCanonical, evidence: PromptEvidence): string {
  return [
    "너는 한국어 운세 리포트 작성가다.",
    "아래 JSON을 바탕으로 사용자용 2026년 운세 리포트를 작성해라.",
    "반드시 JSON만 출력하고 설명/코드블록/마크다운을 포함하지 마라.",
    "반드시 아래 스키마 키를 모두 포함해라: flowType, elementalAnalysis, overall, career, love, money, cautionMonth, opportunityMonth, sections",
    "문체는 친구에게 말하듯 친근한 MZ 톤으로 작성한다.",
    "문장 끝을 딱딱한 '-입니다/-습니다'로 쓰지 말고, '-해요/-해/-하자' 톤으로 써라.",
    "읽는 사람이 '이거 내 데이터 제대로 본 거네'라고 느끼게 구체적 디테일을 넣어라.",
    "아래 '핵심 분석 팩트'에서 최소 4개 이상을 본문에 직접 반영해라.",
    "sections는 정확히 8개이며 title은 아래 순서를 정확히 지켜라:",
    "1) 내 사주 간략한 오행 분석 2) 올해 전체 운 3) 커리어 4) 연애&결혼 5) 금전 6) 조심할 달 7) 기회가 오는 달 8) 1월~12월 월별 운세",
    `각 section은 headline(핵심 한 문장)과 content(최소 ${MIN_SECTION_SENTENCES}문장)를 반드시 포함해라.`,
    "각 section content 마지막 문장에는 반드시 '(근거: key1, key2, ...)' 형식으로 사용한 데이터 키를 명시해라.",
    "8번 섹션(1월~12월 월별 운세)은 아래 포맷을 정확히 지켜라:",
    "1월",
    "- ...",
    "- ...",
    "- ...",
    "2월",
    "- ...",
    "- ...",
    "- ...",
    "...",
    "12월",
    "- ...",
    "- ...",
    "- ...",
    "즉, 1월부터 12월까지 각각 월 헤더 + 최소 3개 라인을 반드시 포함해라.",
    "근거 키는 아래 제공한 실제 데이터 키만 사용해라.",
    "입력 정보에서 GPT가 사용할 정보는 birthDate, birthTime, gender, name만 사용한다.",
    "",
    `사용자 입력: ${JSON.stringify({
      birthDate: input.birthDate,
      birthTime: input.birthTime || "",
      gender: input.gender || "",
      name: input.name || "",
    })}`,
    "",
    `사주 원본(표준화): ${JSON.stringify(canonical)}`,
    "",
    `디테일 작성용 핵심 데이터 스냅샷: ${JSON.stringify(evidence.snapshot)}`,
    "",
    `핵심 분석 팩트: ${JSON.stringify(evidence.facts)}`,
    "",
    "출력 JSON 스키마:",
    JSON.stringify({
      flowType: "상승|변화|정체|도전|회복",
      elementalAnalysis: "string",
      overall: "string",
      career: "string",
      love: "string",
      money: "string",
      cautionMonth: "string",
      opportunityMonth: "string",
      sections: [{ title: "string", headline: "string", content: `string(최소 ${MIN_SECTION_SENTENCES}문장 + 마지막 근거 문장 포함, 단 월별 섹션은 1월~12월 각각 3줄 이상)` }],
    }),
  ].join("\n");
}

function sanitizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function sanitizeContent(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

function extractBrief(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") return value.slice(0, 200);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 5).map((v) => extractBrief(v));
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const entries = Object.entries(obj).slice(0, 10).map(([k, v]) => [k, extractBrief(v)]);
    return Object.fromEntries(entries);
  }
  return String(value).slice(0, 200);
}

function findKeyDeep(input: unknown, key: string, depth = 0): unknown {
  if (!input || typeof input !== "object" || depth > 5) return undefined;
  const obj = input as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const found = findKeyDeep(value, key, depth + 1);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function buildEvidenceSnapshot(raw: Record<string, unknown>): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  for (const key of TARGET_DETAIL_KEYS) {
    const found = findKeyDeep(raw, key);
    if (found !== undefined) {
      snapshot[key] = extractBrief(found);
    }
  }
  return snapshot;
}

function pickDataRoot(raw: Record<string, unknown>): Record<string, unknown> {
  const data = raw.data;
  if (data && typeof data === "object") return data as Record<string, unknown>;
  return raw;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function buildPromptEvidence(raw: Record<string, unknown>): PromptEvidence {
  const root = pickDataRoot(raw);
  const day = toRecord(root.day);
  const year = toRecord(root.year);
  const hour = toRecord(root.hour);
  const five = toRecord(root.five);

  const facts: string[] = [];
  const anchors: string[] = [];

  const dayHangul = typeof day?.hangul === "string" ? day.hangul : "";
  const dayHanja = typeof day?.hanja === "string" ? day.hanja : "";
  const dayStemSipseong = typeof day?.stem_sipseong === "string" ? day.stem_sipseong : "";
  const dayBranchSipseong = typeof day?.branch_sipseong === "string" ? day.branch_sipseong : "";
  if (dayHangul || dayHanja) {
    facts.push(`일주는 ${dayHangul || ""}${dayHanja ? `(${dayHanja})` : ""}입니다.`);
    if (dayHangul) anchors.push(dayHangul);
    if (dayHanja) anchors.push(dayHanja);
  }
  if (dayStemSipseong || dayBranchSipseong) {
    facts.push(`일주 십성은 천간 ${dayStemSipseong || "-"}, 지지 ${dayBranchSipseong || "-"}입니다.`);
    if (dayStemSipseong) anchors.push(dayStemSipseong);
    if (dayBranchSipseong) anchors.push(dayBranchSipseong);
  }

  const yearHangul = typeof year?.hangul === "string" ? year.hangul : "";
  const yearHanja = typeof year?.hanja === "string" ? year.hanja : "";
  if (yearHangul || yearHanja) {
    facts.push(`년주는 ${yearHangul || ""}${yearHanja ? `(${yearHanja})` : ""}입니다.`);
    if (yearHangul) anchors.push(yearHangul);
    if (yearHanja) anchors.push(yearHanja);
  }

  const hourHangul = typeof hour?.hangul === "string" ? hour.hangul : "";
  const hourHanja = typeof hour?.hanja === "string" ? hour.hanja : "";
  if (hourHangul || hourHanja) {
    facts.push(`시주는 ${hourHangul || ""}${hourHanja ? `(${hourHanja})` : ""}입니다.`);
    if (hourHangul) anchors.push(hourHangul);
    if (hourHanja) anchors.push(hourHanja);
  }

  if (five) {
    const entries = (Object.entries(five)
      .map(([k, v]) => [k, toNumber(v)] as const)
      .filter(([, v]) => v !== null) as Array<[string, number]>)
      .sort((a, b) => b[1] - a[1]);
    if (entries.length > 0) {
      const strongest = entries[0];
      const weakest = entries[entries.length - 1];
      facts.push(`오행 분포는 ${entries.map(([k, v]) => `${k} ${v}`).join(", ")} 입니다.`);
      facts.push(`강한 오행은 ${strongest[0]}, 약한 오행은 ${weakest[0]} 입니다.`);
      anchors.push(strongest[0], weakest[0], "오행");
    }
  }

  return {
    snapshot: buildEvidenceSnapshot(raw),
    facts,
    anchors: Array.from(new Set(anchors.filter(Boolean))),
  };
}

function countSentences(text: string): number {
  const matches = text.match(/[^.!?]+[.!?]/g);
  if (!matches) return 0;
  return matches.length;
}

function hasMinSentenceSections(result: FortuneResult): boolean {
  return result.sections.every((section) => {
    if (section.title === "1월~12월 월별 운세") return true;
    return countSentences(section.content) >= MIN_SECTION_SENTENCES;
  });
}

function hasMonthlyCoverage(content: string): boolean {
  for (let month = 1; month <= 12; month += 1) {
    if (!content.includes(`${month}월`)) return false;
  }
  return true;
}

function parseMonthlyLines(content: string): Map<number, string[]> {
  const blocks = new Map<number, string[]>();
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let currentMonth: number | null = null;
  for (const line of lines) {
    const monthHeader = line.match(/^([1-9]|1[0-2])월[:：]?$/);
    if (monthHeader) {
      currentMonth = Number(monthHeader[1]);
      if (!blocks.has(currentMonth)) blocks.set(currentMonth, []);
      continue;
    }
    if (currentMonth) {
      const normalized = line.replace(/^[-*]\s*/, "").trim();
      if (normalized) blocks.get(currentMonth)?.push(normalized);
    }
  }
  return blocks;
}

function hasThreeLinesPerMonth(content: string): boolean {
  const blocks = parseMonthlyLines(content);
  for (let month = 1; month <= 12; month += 1) {
    const lines = blocks.get(month);
    if (!lines || lines.length < 3) return false;
  }
  return true;
}

function hasFormalStyle(text: string): boolean {
  return /(입니다|습니다)([.!?]|$)/.test(text);
}

function hasEvidenceSentence(text: string): boolean {
  return /\(근거:\s*[^)]+\)/.test(text);
}

function hasValidToneAndEvidence(result: FortuneResult, anchors: string[]): boolean {
  const baseFields = [
    result.elementalAnalysis,
    result.overall,
    result.career,
    result.love,
    result.money,
    result.cautionMonth,
    result.opportunityMonth,
  ];
  if (baseFields.some((v) => hasFormalStyle(v))) return false;
  const allText = `${baseFields.join(" ")} ${result.sections
    .map((s) => `${s.headline} ${s.content}`)
    .join(" ")}`;
  const matchedAnchorCount = anchors.filter((a) => allText.includes(a)).length;
  if (anchors.length > 0 && matchedAnchorCount < Math.min(2, anchors.length)) return false;
  return result.sections.every((section) => {
    if (hasFormalStyle(section.headline) || hasFormalStyle(section.content)) return false;
    return hasEvidenceSentence(section.content);
  });
}

function hasValidMonthlySection(result: FortuneResult): boolean {
  const monthly = result.sections.find((s) => s.title === "1월~12월 월별 운세");
  if (!monthly) return false;
  return hasMonthlyCoverage(monthly.content) && hasThreeLinesPerMonth(monthly.content);
}

function normalizeFortuneResult(raw: unknown): FortuneResult | null {
  const validated = gptResultSchema.safeParse(raw);
  if (!validated.success) return null;

  const r = validated.data;
  const sectionMap = new Map<string, { headline: string; content: string }>();
  for (const section of r.sections) {
    const title = sanitizeText(section.title);
    const headline = sanitizeText(section.headline);
    const content = sanitizeContent(section.content);
    if (title && content) sectionMap.set(title, { headline, content });
  }

  const elementalAnalysis = sanitizeText(r.elementalAnalysis);
  const overall = sanitizeText(r.overall);
  const career = sanitizeText(r.career);
  const love = sanitizeText(r.love);
  const money = sanitizeText(r.money);
  const cautionMonth = sanitizeText(r.cautionMonth);
  const opportunityMonth = sanitizeText(r.opportunityMonth);
  const monthlyByField = sanitizeContent((r as { monthlyFortune?: string }).monthlyFortune || "");

  if (!elementalAnalysis || !overall || !career || !love || !money || !cautionMonth || !opportunityMonth) {
    return null;
  }

  const byTitle: Record<(typeof FIXED_SECTION_TITLES)[number], { headline: string; content: string }> = {
    "내 사주 간략한 오행 분석": {
      headline: elementalAnalysis,
      content: elementalAnalysis,
    },
    "올해 전체 운": {
      headline: overall,
      content: overall,
    },
    "커리어": {
      headline: career,
      content: career,
    },
    "연애&결혼": {
      headline: love,
      content: love,
    },
    "금전": {
      headline: money,
      content: money,
    },
    "조심할 달": {
      headline: cautionMonth,
      content: cautionMonth,
    },
    "기회가 오는 달": {
      headline: opportunityMonth,
      content: opportunityMonth,
    },
    "1월~12월 월별 운세": {
      headline: "월별로 보면 타이밍이 더 또렷하게 보여요.",
      content: monthlyByField || "1월부터 12월까지 월별 흐름을 정리해 주세요.",
    },
  };

  const sections = FIXED_SECTION_TITLES.map((title) => ({
    title,
    headline: sectionMap.get(title)?.headline || byTitle[title].headline,
    content: sectionMap.get(title)?.content || byTitle[title].content,
  }));

  if (!sections.every((section) => section.content)) return null;

  return {
    flowType: r.flowType,
    elementalAnalysis,
    overall,
    career,
    love,
    money,
    cautionMonth,
    opportunityMonth,
    sections,
  };
}

function buildRepairPrompt(initial: unknown, facts: string[]): string {
  return [
    "아래 JSON은 운세 리포트 초안이다.",
    "동일한 의미를 유지하되, 반드시 형식 요건을 맞춰서 JSON만 다시 출력해라.",
    "요건:",
    "1) sections는 정확히 8개, title 순서 고정",
    `2) 각 section은 headline 1문장 + content 최소 ${MIN_SECTION_SENTENCES}문장`,
    "3) 친구에게 말하듯 친근한 MZ 톤 유지 ('-입니다/-습니다' 금지)",
    "4) 각 section content 마지막 문장에 '(근거: key1, key2, ...)' 필수",
    "5) 8번 섹션은 1월~12월 모든 월 이름을 반드시 포함 + 각 월마다 최소 3줄",
    "6) 8번 섹션은 반드시 '1월' 다음 3줄, '2월' 다음 3줄 ... '12월' 다음 3줄 포맷 유지",
    "7) 설명/코드블록/마크다운 금지",
    "8) 아래 핵심 분석 팩트 최소 4개를 본문에 직접 반영",
    "",
    "title 순서:",
    "내 사주 간략한 오행 분석, 올해 전체 운, 커리어, 연애&결혼, 금전, 조심할 달, 기회가 오는 달, 1월~12월 월별 운세",
    "",
    `핵심 분석 팩트: ${JSON.stringify(facts)}`,
    "",
    `초안 JSON: ${JSON.stringify(initial)}`,
  ].join("\n");
}

async function requestChatCompletion(userPrompt: string): Promise<string | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "JSON 출력만 허용됩니다.",
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    console.error("[GPT] API error", { status: res.status, body: errorText.slice(0, 500) });
    return null;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    console.error("[GPT] empty content");
    return null;
  }
  return content;
}

function extractJsonObject(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    const candidate = fenced[1].trim();
    if (candidate.startsWith("{") && candidate.endsWith("}")) return candidate;
  }

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    return trimmed.slice(first, last + 1);
  }
  return null;
}

export async function narrateFortuneWithGPT(input: FortuneInput, canonical: SajuCanonical): Promise<FortuneResult> {
  if (!env.OPENAI_API_KEY) {
    console.warn("[GPT] OPENAI_API_KEY missing -> fallback");
    return generateFortune(input);
  }

  const fallback = generateFortune(input);
  const evidence = buildPromptEvidence(canonical.baseData);
  const firstContent = await requestChatCompletion(buildPrompt(input, canonical, evidence));
  if (!firstContent) return fallback;
  try {
    const jsonText = extractJsonObject(firstContent);
    if (!jsonText) {
      console.error("[GPT] could not extract JSON -> fallback", {
        preview: firstContent.slice(0, 300),
      });
      return fallback;
    }

    const parsed = JSON.parse(jsonText) as unknown;
    const normalized = normalizeFortuneResult(parsed);
    if (
      normalized &&
      hasMinSentenceSections(normalized) &&
      hasValidToneAndEvidence(normalized, evidence.anchors) &&
      hasValidMonthlySection(normalized)
    ) {
      console.info("[GPT] success");
      return normalized;
    }

    console.warn("[GPT] format not satisfied, retrying once");
    const repairedContent = await requestChatCompletion(buildRepairPrompt(parsed, evidence.facts));
    if (!repairedContent) return fallback;
    const repairedJsonText = extractJsonObject(repairedContent);
    if (!repairedJsonText) return fallback;
    const repairedParsed = JSON.parse(repairedJsonText) as unknown;
    const repaired = normalizeFortuneResult(repairedParsed);
    if (
      repaired &&
      hasMinSentenceSections(repaired) &&
      hasValidToneAndEvidence(repaired, evidence.anchors) &&
      hasValidMonthlySection(repaired)
    ) {
      console.info("[GPT] success after repair");
      return repaired;
    }
    return fallback;
  } catch (error) {
    console.error("[GPT] parse error -> fallback", error);
    return fallback;
  }
}
