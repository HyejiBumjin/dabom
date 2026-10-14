import type { ReportDomain } from "@/lib/saju/report-facts";

export interface ParagraphLength { min: number; target: number; max: number }

/** The opening and closing need less space than the annual interpretation. */
export const REPORT_PARAGRAPH_LENGTHS: Record<ReportDomain, ParagraphLength> = {
  essence: { min: 180, target: 230, max: 280 },
  yearly: { min: 220, target: 330, max: 400 },
  relation: { min: 220, target: 330, max: 400 },
  career: { min: 220, target: 330, max: 400 },
  mental: { min: 200, target: 330, max: 400 },
  summary: { min: 100, target: 140, max: 180 },
};

/** Annual overview, grounded encouragement, and a complete messenger farewell. */
export const MESSAGE_CLOSING_LENGTH: ParagraphLength = { min: 160, target: 230, max: 290 };

export const SUGGESTION_ENDING = /해\s*보자|(?<!후|홍|제|정)보자(?=[.!?…\s]|$)|(?:하자|해봐|힘내자|이어가자|나아가자|남기자|정하자|두자)(?=[.!?…]|$)/u;

/** Message-style reports use conversational endings, including before emoji. */
export const FORMAL_REPORT_ENDING = /[가-힣]+다(?=[.!?。！？…]+[”’"')]*(?:\s|$|\p{Extended_Pictographic})|[”’"')]*\s*(?:\n|$|\p{Extended_Pictographic}))/u;

/** A single annual opening is enough to establish the essay's time frame. */
export const ANNUAL_OPENING = /^[\s'"‘’“”]*(?:올해|올\s*한\s*해|금년|이번\s*(?:해|년도?|한\s*해)|\d{4}년)/u;

/** Remove a redundant modifier, without changing facts or adding new prose. */
export function repairRepeatedAnnualOpenings(paragraphs: string[], requiredYearTerms: string[][], targetYear: number) {
  const removable = new RegExp(`^(?:올해|올\\s*한\\s*해|금년|이번\\s*(?:해|년도?|한\\s*해)|${targetYear}년)(?:에는|에도|부터|까지|동안|엔|은|는|에|의|도)?(?:,\\s*|\\s+)`, "u");
  let hasAnnualOpening = false;
  return paragraphs.map((paragraph, index) => {
    if (!ANNUAL_OPENING.test(paragraph)) return paragraph;
    if (!hasAnnualOpening) {
      hasAnnualOpening = true;
      return paragraph;
    }
    const repaired = paragraph.replace(removable, "").trim();
    // Keep mandatory year evidence, and never strip a different year's facts.
    const yearTerms = requiredYearTerms[index] ?? [];
    if (!repaired || ANNUAL_OPENING.test(repaired) || (yearTerms.length > 0 && !yearTerms.some(term => repaired.includes(term)))) return paragraph;
    return repaired;
  });
}

function readerNamePattern(name: string) {
  const fullName = name.trim();
  if (!fullName) return null;
  const names = /^[가-힣]{3,4}$/u.test(fullName) ? [fullName, fullName.slice(1)] : [fullName];
  const alternatives = names.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  // Match the name as an address or subject, including Korean particles, rather
  // than matching it inside an unrelated word.
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives})(?=(?:님|씨|아|야|이|가|은|는|을|를|의|에게|한테|에|와|과|도|만|부터|처럼|로|으로|랑|하고)*(?:$|[\\s\\p{P}]))`, "gu");
}

export function containsReaderName(text: string, name: string) {
  return readerNamePattern(name)?.test(text) ?? false;
}

/** Old drafts can contain a name; don't send that name back to the renderer. */
export function redactReaderName(text: string, name: string) {
  const pattern = readerNamePattern(name);
  return pattern ? text.replace(pattern, "너") : text;
}

export function normalizeReportParagraph(paragraph: string) {
  return paragraph.replace(/\r\n?/g, "\n").trim()
    .replace(/[^\S\n]+/gu, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

export function countReportCharacters(paragraph: string) {
  // Decorations and line breaks must not fill the minimum evidence length.
  const prose = normalizeReportParagraph(paragraph)
    .replace(/\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|\uFE0F|\u200D|\u20E3/gu, "")
    .replace(/\s+/gu, " ").trim();
  return [...prose].length;
}

export function hasReportTerm(text: string, term: string) {
  // 충/합 must be used as terms. Words such as 충실/충분/합리적 are
  // neither evidence nor a technical opening.
  if (term === "충" || term === "합") {
    return new RegExp(`(?:^|[\\s\\p{P}])${term}(?=$|[\\s\\p{P}]|은|이|을|과|의|에|으로|이라|라는|도|부터)`, "u").test(text);
  }
  return text.includes(term);
}

/** Editorial check only: the first mention should explain itself nearby. */
export function hasInlineTermExplanation(paragraph: string, term: string) {
  const block = paragraph.split(/\n+/u).find(message => hasReportTerm(message, term));
  if (!block) return false;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const mention = block.match(new RegExp(`(?:^|[\\s\\p{P}])${escaped}`, "u"));
  const start = mention ? block.indexOf(term, mention.index) : block.indexOf(term);
  // A year label already explains the name of the annual pillar.
  if (term === "병오" && /\d{4}년(?:인|의)?\s*$/u.test(block.slice(0, start))) return true;
  const nearby = block.slice(start + term.length, start + term.length + 140);
  if (/^[”’'"]?\s*\([^()\n]{4,65}\)/u.test(nearby)) return true;
  const clause = nearby.split(/[.!?。！？]/u)[0];
  // A definition of a different term later in the sentence does not explain
  // this one (e.g. "병오 세운에 식신, 쉽게 말하면 ...").
  if (/갑목|을목|병화|정화|무토|기토|경금|신금|임수|계수|식신|상관|비견|겁재|정재|편재|정관|편관|정인|편인|비겁|식상|재성|관성|인성|일간|원국|세운|대운|월운|병오|갑신/u.test(clause)) return false;
  return /쉽게\s*(?:말하면|풀면)|말하자면|그러니까|즉[,\s]|(?:뜻|말|흐름|기운|힘)(?:이야|이지|이거든|이네|인데|을\s*(?:말|뜻|가리))|가리켜|뜻해/u.test(clause);
}
