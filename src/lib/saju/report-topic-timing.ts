import type { MonthlyRelationMonth, ReportFacts } from "./report-facts";

export const TIMING_DOMAINS = ["yearly", "career", "relation"] as const;
export type TimingDomain = typeof TIMING_DOMAINS[number];
export type TopicTiming = Record<TimingDomain, MonthlyRelationMonth[]>;
// 편집용 주제 적합도. 길흉·성사 확률·금전 점수가 아니다.
const RELEVANCE: Record<TimingDomain, Record<string, number>> = {
  yearly: { 정관: 4, 편관: 4, 식신: 3, 상관: 3, 정인: 2, 편인: 2 },
  career: { 정재: 4, 편재: 4, 겁재: 3, 식신: 2, 상관: 2 },
  relation: { 비견: 4, 겁재: 3, 정인: 3, 편인: 3, 식신: 2 },
};

/** Assign every selected period once. Fewer periods never cause invented dates. */
export function assignTopicTiming(facts: Pick<ReportFacts, "monthlyRelationMonths">): TopicTiming {
  const months = [...facts.monthlyRelationMonths].sort((a, b) => a.ordinal - b.ordinal);
  if (months.length > TIMING_DOMAINS.length) throw new Error("대표 월운은 최대 세 기간입니다.");
  let best: TopicTiming = { yearly: [], career: [], relation: [] };
  let bestScore = -1;
  const visit = (index: number, plan: TopicTiming, used: TimingDomain[], score: number) => {
    if (index === months.length) {
      if (score > bestScore) { best = plan; bestScore = score; }
      return;
    }
    for (const domain of TIMING_DOMAINS) {
      if (used.includes(domain)) continue;
      const month = months[index];
      visit(index + 1, { ...plan, [domain]: [month] }, [...used, domain], score + (RELEVANCE[domain][month.stemTenGod] ?? 1));
    }
  };
  visit(0, best, [], 0);
  return best;
}
