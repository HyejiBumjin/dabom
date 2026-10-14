import { INTERPRETATION_CORPUS } from "@/lib/saju/interpretation-corpus";
import type { ReportFacts } from "@/lib/saju/report-facts";

export interface ReportTermMeaning { term: string; meaning: string }

/** Definitions are renderer input, not finished examples or new predictions. */
export function buildReportTerminology(facts: ReportFacts): ReportTermMeaning[] {
  const terms: ReportTermMeaning[] = [];
  const add = (term: string, meaning: string | undefined) => {
    if (meaning && !terms.some(entry => entry.term === term)) terms.push({ term, meaning });
  };
  const fromCorpus = (id: string) => INTERPRETATION_CORPUS.find(fragment => fragment.id === id)?.mechanism;
  const dayMaster = { 甲: "갑목", 乙: "을목", 丙: "병화", 丁: "정화", 戊: "무토", 己: "기토", 庚: "경금", 辛: "신금", 壬: "임수", 癸: "계수" }[facts.dayMaster];
  if (dayMaster) add(dayMaster, fromCorpus(`F-DAY-${facts.dayMaster}`));
  for (const god of new Set([facts.annualTenGod, facts.daYunTenGod])) {
    // Reuse the approved interpretation's core meaning. Its annual scenario
    // and advice are deliberately excluded; a definition does not set timing.
    add(god, fromCorpus(`F-ANNUAL-${god}`)?.replace(/올해\s*/gu, ""));
  }
  if (facts.dominantTenGodGroup) add(facts.dominantTenGodGroup, fromCorpus(`F-GROUP-${facts.dominantTenGodGroup}`));
  if (facts.mentalInteraction) add(facts.mentalInteraction, fromCorpus(`F-INTERACTION-${facts.mentalInteraction}`));
  if (facts.monthlyRelation !== "none") {
    const term = facts.monthlyRelation === "clash" ? "충" : "합";
    add(term, fromCorpus(`F-MONTHLY-${term}`));
  }
  add("일간", "태어난 날을 기준으로 타고난 기질을 읽는 기준.");
  add("원국", "태어날 때의 사주 구성으로 읽는 원래 성향과 구조.");
  add("세운", "한 해의 운의 흐름. 올해의 환경을 읽는 시간 범위.");
  add("대운", "10년 단위로 이어지는 운의 흐름. 올해 운세의 장기 배경.");
  add("월운", "한 달의 운의 흐름. 대화와 일정을 조율할 시점을 읽는 범위.");
  if (facts.annualGanZhi === "丙午") add("병오", `${facts.targetYear}년을 가리키는 간지 이름.`);
  if (facts.daYunGanZhi === "甲申") add("갑신", "현재 10년 단위 대운을 가리키는 간지 이름.");
  return terms;
}
