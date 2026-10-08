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

export const SUGGESTION_ENDING = /해\s*보자|(?<!후|홍|제|정)보자(?=[.!?…\s]|$)|(?:하자|해봐|힘내자|이어가자|나아가자|남기자|정하자|두자)(?=[.!?…]|$)/u;

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
  return paragraph.trim().replace(/\p{Extended_Pictographic}/gu, "").replace(/\s{2,}/g, " ");
}

export function countReportCharacters(paragraph: string) {
  return [...normalizeReportParagraph(paragraph)].length;
}

export function hasReportTerm(text: string, term: string) {
  // 충/합 must be used as terms. Words such as 충실/충분/합리적 are
  // neither evidence nor a technical opening.
  if (term === "충" || term === "합") {
    return new RegExp(`(?:^|[\\s\\p{P}])${term}(?=$|[\\s\\p{P}]|은|이|을|과|의|에|으로|이라|라는|도|부터)`, "u").test(text);
  }
  return text.includes(term);
}
