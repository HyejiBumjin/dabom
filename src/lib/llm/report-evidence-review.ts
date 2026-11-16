import type { ReportRenderPayload, ReportObservation, ReportSection } from "@/lib/saju/report-payload";
import { hasReadingMaterial } from "@/lib/saju/report-reading-plan";
import { hasReportTerm, hasReportTimingTerm } from "./report-rules";
import { stripReportDecorations } from "@/lib/report-emoticons";

export interface EvidenceUse { evidence_id: string; excerpt: string }
export const BODY_SECTIONS = ["yearly", "relation", "career", "mental"];
const comparable = (value: string) => stripReportDecorations(value).replace(/\s+/gu, " ").trim();

/** Carry the existing prefix-only editorial repair through the exact quotation. */
export function repairEvidenceExcerpts(before: string, after: string, uses: EvidenceUse[]): EvidenceUse[] {
  if (!before.endsWith(after) || before === after) return uses;
  const removed = before.slice(0, before.length - after.length);
  return uses.map(use => use.excerpt.startsWith(removed) ? { ...use, excerpt: use.excerpt.slice(removed.length) } : use);
}

/** Finite surface check, not a claim to verify the semantic truth of a reading. */
export function excerptMentionsEvidence(observation: ReportObservation, excerpt: string, payload: ReportRenderPayload): boolean {
  if (observation.kind === "period") {
    const period = payload.yearly_context.timing[(observation.value as { timing_index: number }).timing_index];
    return Boolean(period && hasReportTimingTerm(excerpt, period.month, payload.seun.year));
  }
  if (observation.terms.some(term => hasReportTerm(excerpt, term))) return true;
  const value = observation.value as Record<string, unknown>;
  if (observation.kind === "season") return /계절|태어날 때|태어난 때|여름|겨울|봄|가을|따뜻|더운|차가운|추운/u.test(excerpt);
  if (observation.kind === "roots") return /뿌리|버팀|기반/u.test(excerpt);
  if (observation.kind === "exact-stem-occurrences") return /같은.{0,12}(?:글자|힘|기운|역할)|되풀이|반복/u.test(excerpt);
  if (observation.kind === "stem-link") return /이어|보태|쓰이|쓰는|조절|누르|돕|도움|돋우|생하|극하|뻗|맞물/u.test(excerpt);
  if (observation.kind === "branch-relation") {
    if (value.kind === "clash") return /부딪|맞서|충돌/u.test(excerpt);
    if (value.kind === "combination") return /합쳐|묶이|결합|이어/u.test(excerpt);
  }
  if (observation.kind === "shinsal") {
    const symbol = value.name;
    if (symbol === "도화") return /시선|주목|눈에 띄|관심을 받/u.test(excerpt);
    if (symbol === "역마") return /이동|옮기|낯선|새로운 환경/u.test(excerpt);
    if (symbol === "화개") return /몰입|탐구|집중|혼자/u.test(excerpt);
    if (symbol === "천을귀인") return /도움|도와|지원/u.test(excerpt);
  }
  return false;
}

export function evidenceUseIssues(section: ReportSection, paragraph: string, uses: EvidenceUse[], payload: ReportRenderPayload): string[] {
  if (!BODY_SECTIONS.includes(section.id)) return uses.length ? ["도입·마무리의 evidence_uses는 빈 배열로 두세요."] : [];
  const issues: string[] = [];
  const allowed = new Set([...section.primary_evidence_ids, ...section.context_evidence_ids]);
  const unique = new Set(uses.map(use => use.evidence_id));
  if (unique.size < 2 || unique.size !== uses.length) issues.push("서로 다른 실제 근거 두 개 이상을 본문에 연결하고 evidence_uses에 각각 기록하세요.");
  if (!uses.some(use => section.reading_plan.basis_ids.includes(use.evidence_id))) issues.push("reading_plan의 핵심 근거를 본문에서 실제로 설명하고 그 구절을 evidence_uses에 기록하세요.");
  for (const use of uses) {
    const observation = payload.observations.find(item => item.id === use.evidence_id);
    if (!observation || !allowed.has(use.evidence_id) || !hasReadingMaterial(observation)) {
      issues.push(`사용할 수 없는 근거 ${use.evidence_id}. 이 주제의 실제 근거만 선택하고 빈 항목·다른 주제의 근거를 제외하세요.`);
      continue;
    }
    const excerpt = comparable(use.excerpt);
    if (excerpt.length < 8 || !comparable(paragraph).includes(excerpt)) {
      issues.push(`근거 ${use.evidence_id}의 excerpt가 본문에 없습니다. 풀이에 사용한 구절을 그대로 옮기세요.`);
    } else if (!excerptMentionsEvidence(observation, excerpt, payload)) {
      issues.push(`근거 ${use.evidence_id}의 실제 뜻이나 시점을 해당 구절에서 확인할 수 없습니다. 용어·뜻·시점을 연결해 설명한 구절을 기록하세요.`);
    }
  }
  return issues;
}

/** Bounded editorial repair: never replace uncertainty with invented certainty. */
export function getSpecificityIssues(sectionId: string, paragraph: string): string[] {
  if (!BODY_SECTIONS.includes(sectionId)) return [];
  const text = comparable(paragraph);
  const sentences = text.split(/[.!?。！？]/u).filter(part => /[가-힣]/u.test(part));
  const hedged = sentences.filter(part => /수(?:는|도)?\s*있|가능성|듯해|것\s*같/u.test(part)).length;
  return hedged >= 3 || (hedged >= 2 && hedged / sentences.length >= 0.5)
    ? ["막연한 가능성 문장이 반복됩니다. 선택한 근거 두 개가 만드는 중심 해석과 적용 조건을 구체적으로 풀고, 가정 예시는 한 번만 사용하세요. '수 있어'만 삭제하거나 실제 사건을 확정하는 수정은 금지입니다."] : [];
}

export function editorialPenalty(message: string): number {
  return /막연한 가능성|다른 본문과 긴 설명|일과 돈 주제|행동 조언이 여러/u.test(message) ? 10 : 1;
}
