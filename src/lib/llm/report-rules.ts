import type { ReportDomain } from "@/lib/saju/report-facts";
import { stripReportDecorations } from "@/lib/report-emoticons";

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

/** Check prose after removing recognized faces (which may use Greek/Thai letters).
 * Han has its own existing validation; Latin abbreviations and Hangul stay valid.
 * Never delete or guess the meaning of an unexpected word here.
 */
export function getUnexpectedReportCharacters(paragraph: string): string[] {
  const prose = stripReportDecorations(paragraph).normalize("NFC");
  return [...new Set([...prose].filter(character => character === "\uFFFD" || (
    /[\p{L}\p{M}]/u.test(character)
    && !/[\p{Script=Hangul}\p{Script=Latin}\p{Script=Han}]/u.test(character)
  )))].slice(0, 12);
}

export function countReportCharacters(paragraph: string) {
  // Decorations and line breaks must not fill the minimum evidence length.
  const prose = stripReportDecorations(normalizeReportParagraph(paragraph))
    .replace(/\s+/gu, " ").trim();
  return [...prose].length;
}

/** 세운 also occurs in the ordinary verb 세우다; keep this exception local. */
function seunTermIndex(text: string) {
  for (let index = text.indexOf("세운"); index !== -1; index = text.indexOf("세운", index + 2)) {
    const before = text.slice(0, index);
    const after = text.slice(index + 2);
    if (/^다(?:면|고|는|니|며|면서)?(?=$|[\s\p{P}])/u.test(after)) continue;
    const ordinaryObject = /(?:계획|목표|기준|원칙|규칙|예산|방향|우선순위|경계|일정|한도)(?:을|를)\s+(?:(?:미리|함께|다시|먼저|새로|직접|단단히|분명히)\s+){0,3}$/u.test(before);
    if (ordinaryObject && /^(?:\s|[.!?,])/u.test(after)) continue;
    return index;
  }
  return -1;
}

export function hasReportTerm(text: string, term: string) {
  if (term === "세운") return seunTermIndex(text) !== -1;
  // 충/합 must be used as terms. Words such as 충실/충분/합리적 are
  // neither evidence nor a technical opening.
  if (term === "충" || term === "합") {
    return new RegExp(`(?:^|[\\s\\p{P}])${term}(?=$|[\\s\\p{P}]|은|이|을|과|의|에|으로|이라|라는|도|부터)`, "u").test(text);
  }
  return text.includes(term);
}

interface ReportDateRange {
  startYear?: number;
  startMonth: number;
  startDay: number;
  endYear?: number;
  endMonth: number;
  endDay: number;
}

// Accept only equivalent spellings of the approved date interval. Month-only
// mentions and approximations cannot replace the calculated start/end dates.
const DATE_RANGE_PATTERN = /(?<!\d)(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*(?:[~～〜–—-]|부터|에서)\s*(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일(?:\s*까지)?/gu;

function dateRange(match: RegExpMatchArray): ReportDateRange {
  return {
    startYear: match[1] ? Number(match[1]) : undefined,
    startMonth: Number(match[2]), startDay: Number(match[3]),
    endYear: match[4] ? Number(match[4]) : undefined,
    endMonth: Number(match[5]), endDay: Number(match[6]),
  };
}

export function hasReportTimingTerm(text: string, term: string, reportYear: number) {
  const approvedMatch = [...term.matchAll(DATE_RANGE_PATTERN)][0];
  if (!approvedMatch || approvedMatch[0].length !== term.length) {
    // Legacy month labels still need a numeric boundary: 1월 is not 11월.
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/gu, "\\s*");
    return new RegExp(`(?<!\\d)${escaped}(?!\\d)`, "u").test(text);
  }
  const approved = dateRange(approvedMatch);
  const approvedStartYear = approved.startYear ?? reportYear;
  const approvedEndYear = approved.endYear ?? approvedStartYear;
  return [...text.matchAll(DATE_RANGE_PATTERN)].some(match => {
    const actual = dateRange(match);
    // Explicit next-year labels must remain explicit, including at year-end.
    if (approved.startYear && actual.startYear !== approved.startYear) return false;
    if (approved.endYear && actual.endYear !== approved.endYear) return false;
    return (actual.startYear ?? reportYear) === approvedStartYear
      && (actual.endYear ?? actual.startYear ?? reportYear) === approvedEndYear
      && actual.startMonth === approved.startMonth && actual.startDay === approved.startDay
      && actual.endMonth === approved.endMonth && actual.endDay === approved.endDay;
  });
}

const TECHNICAL_EXPLANATION_TERMS = /갑목|을목|병화|정화|무토|기토|경금|신금|임수|계수|식신|상관|비견|겁재|정재|편재|정관|편관|정인|편인|비겁|식상|재성|관성|인성|일간|원국|세운|대운|월운|병오|갑신|화극금|수극화/u;

/** Narrow editorial feedback only; callers must never make these content gates. */
export function getReportReadabilityIssues(paragraph: string): string[] {
  const issues: string[] = [];
  const labelPattern = new RegExp(`(?<![\\p{L}\\p{N}])(${TECHNICAL_EXPLANATION_TERMS.source}|육합|육충|합|충)\\s*[（(]([^()（）\\n]{1,100})[）)]`, "gu");
  const duplicate = [...paragraph.matchAll(labelPattern)].find(match => hasReportTerm(match[2], match[1]));
  if (duplicate) issues.push(`용어 '${duplicate[1]}'이 괄호 안팎에서 반복됩니다. 같은 용어로 뜻을 설명하지 말고 쉬운 뜻 뒤에 (${duplicate[1]})를 한 번만 붙이세요.`);

  // Observed vague formulations, not a ban on ordinary words such as 관계 or 기준.
  const vague = paragraph.match(/기존\s*조건과\s*새\s*요구를\s*조정하는\s*관계|경쟁과\s*몫을\s*살피는|기능이\s*더해져|기질이\s*작동해/u)?.[0];
  if (vague) issues.push(`'${vague}'만으로는 생활에서 무슨 뜻인지 알기 어렵습니다. 사주 근거를 유지하면서 누가 무엇을 정하거나 바꾸는지 쉬운 말로 풀어 주세요. 새로운 사건은 만들지 마세요.`);

  // Limit this to meta disclaimers about calculation, not ordinary cautions
  // about other people's feelings or uncertain personal circumstances.
  const disclaimer = paragraph.match(/(?:날짜(?:의\s*관계)?|사주|계산|합\s*[·/]\s*충|합과\s*충)(?:만으로|로는|으로는|으로|는)?[^.!?。！？\n]{0,40}(?:실제\s*)?(?:사건|결과)(?:을|를)?\s*(?:단정|확정|예측)할\s*수(?:는|도)?\s*없|(?:관계만으로|이것만으로)\s*실제\s*사건을\s*(?:단정|확정|예측)할\s*수(?:는|도)?\s*없/u)?.[0];
  if (disclaimer) issues.push("명리 계산으로 사건을 단정할 수 없다는 작성자용 설명이 들어갔습니다. 면책 문구를 반복하지 말고 근거가 적용되는 상황과 선택할 때 살필 점을 설명하세요. 결과를 확정하는 문장으로 바꾸지 마세요.");
  return issues;
}

/** Editorial check only: explain in ordinary words before the first (term). */
export function hasInlineTermExplanation(paragraph: string, term: string) {
  const block = paragraph.split(/\n+/u).find(message => hasReportTerm(message, term));
  if (!block) return false;
  const start = term === "세운" ? seunTermIndex(block) : block.indexOf(term);
  const before = block.slice(0, start);
  const after = block.slice(start + term.length);
  // Only the single term belongs in parentheses. A term-first gloss, a list
  // of technical names or a nearby kaomoji is not an explanation-first label.
  if (!/[（(]\s*$/u.test(before) || !/^\s*[）)]/u.test(after)) return false;
  const preceding = before.replace(/[（(]\s*$/u, "");
  const clause = stripReportDecorations(preceding.split(/[.!?。！？;；:：,，()（）\n]/u).at(-1) ?? "").trim();
  // Never borrow an explanation across a sentence, paragraph, or another
  // parenthesized label. Numeric year labels are sufficient for 병오 alone.
  if (term === "병오" && /\d{4}년(?:인|의)?\s*$/u.test(clause)) return true;
  if (TECHNICAL_EXPLANATION_TERMS.source.split("|").some(candidate => hasReportTerm(clause, candidate))) return false;
  const ordinaryLetters = clause.match(/[가-힣]/gu)?.length ?? 0;
  const words = clause.split(/\s+/u).filter(Boolean).length;
  // Short everyday phrases such as "차이를 보는 눈" still explain a term.
  // Keep bare labels like "그 힘" and "좋은 힘" from passing this style check.
  return (ordinaryLetters >= 8 && words >= 2) || (ordinaryLetters >= 6 && words >= 3);
}
