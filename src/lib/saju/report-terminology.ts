import type { ReportFacts } from "@/lib/saju/report-facts";

export interface ReportTermMeaning { term: string; meaning: string }

// Plain-language paraphrases of the approved corpus, not additional readings.
// Keep these separate from the technical evidence used to select a fragment.
const DAY_MASTER_MEANINGS: Record<string, string> = {
  갑목: "스스로 옳다고 생각한 일을 밀고 나가고, 앞에서 이끄는 성향.",
  을목: "상황에 맞게 방법을 바꾸면서도, 마음먹은 일을 쉽게 놓지 않는 성향.",
  병화: "생각과 감정을 솔직하게 드러내고, 시원하게 행동하는 성향.",
  정화: "한 가지에 깊이 집중하고, 작은 차이까지 살피는 성향.",
  무토: "마음을 쉽게 바꾸지 않고, 하던 일을 묵묵히 이어 가는 성향.",
  기토: "가까운 사람을 잘 챙기고, 실제로 도움이 되는 것을 따지는 성향.",
  경금: "해야 할 일과 그만둘 일을 분명하게 정하고, 바로 움직이는 성향.",
  신금: "작은 차이를 잘 알아차리고, 스스로 한 일을 꼼꼼히 고치는 성향.",
  임수: "상황에 맞게 대처하며, 속마음을 바로 드러내기보다 깊이 생각하는 성향.",
  계수: "다른 사람의 표정과 마음 변화를 빨리 알아차리고, 정을 주는 성향.",
};

const TEN_GOD_PLAIN_MEANINGS: Record<string, string> = {
  비견: "내 생각대로 결정하고, 다른 사람과 대등하게 함께하는 것.",
  겁재: "다른 사람과 힘을 모으면서도, 누가 얼마나 맡고 가져갈지 정하는 것.",
  식신: "배운 것을 써서 꾸준히 만들고 보여 주는 것.",
  상관: "내 생각을 말하고, 하던 방법을 더 좋게 바꾸는 것.",
  편재: "돈과 시간을 한곳에만 두지 않고, 여러 일에 써 보는 것.",
  정재: "쓸 돈과 시간을 미리 따져 보고, 꾸준히 챙기는 것.",
  편관: "해야 할 일이 어렵거나 몰릴 때, 먼저 할 일을 정하고 해내는 것.",
  정관: "맡은 일을 제대로 해내고, 정해진 약속을 지키는 것.",
  편인: "다른 방법을 배워 보고, 나에게 맞는 것을 찾는 것.",
  정인: "배우고 도움을 받아, 무엇을 할지 더 잘 알게 되는 것.",
};

const GROUP_PLAIN_MEANINGS: Record<string, string> = {
  비겁: "내 뜻대로 해내려는 마음과, 다른 사람과 함께하거나 경쟁하는 모습을 묶어 읽는 말.",
  식상: "생각을 말로 전하고, 직접 만들어 보여 주는 일을 묶어 읽는 말.",
  재성: "돈과 시간을 어디에 쓰고, 실제로 무엇을 얻는지 함께 읽는 말.",
  관성: "맡은 일을 해내고 약속을 지키는 일, 그때 느끼는 부담을 함께 읽는 말.",
  인성: "배우고 도움을 받으며, 행동하기 전에 생각하는 모습을 묶어 읽는 말.",
};

const INTERACTION_PLAIN_MEANINGS: Record<string, string> = {
  화극금: "오행에서 불이 쇠를 제어하는 관계. 올해 글자와 나를 나타내는 글자 사이의 관계를 읽는 말.",
  수극화: "오행에서 물이 불을 제어하는 관계. 올해 글자와 나를 나타내는 글자 사이의 관계를 읽는 말.",
};

export function getTenGodPlainMeaning(god: string): string {
  const meaning = TEN_GOD_PLAIN_MEANINGS[god];
  if (!meaning) throw new Error("확인되지 않은 십신의 뜻은 만들 수 없습니다.");
  return meaning;
}

/** Definitions are renderer input, not finished examples or new predictions. */
export function buildReportTerminology(facts: ReportFacts, extraTenGods: string[] = []): ReportTermMeaning[] {
  const terms: ReportTermMeaning[] = [];
  const add = (term: string, meaning: string | undefined) => {
    if (meaning && !terms.some(entry => entry.term === term)) terms.push({ term, meaning });
  };
  const dayMaster = { 甲: "갑목", 乙: "을목", 丙: "병화", 丁: "정화", 戊: "무토", 己: "기토", 庚: "경금", 辛: "신금", 壬: "임수", 癸: "계수" }[facts.dayMaster];
  if (dayMaster) add(dayMaster, DAY_MASTER_MEANINGS[dayMaster]);
  for (const god of new Set([facts.annualTenGod, facts.daYunTenGod, facts.natalMonthTenGod, facts.natalMonthMainTenGod, ...extraTenGods])) {
    add(god, TEN_GOD_PLAIN_MEANINGS[god]);
  }
  if (facts.dominantTenGodGroup) add(facts.dominantTenGodGroup, GROUP_PLAIN_MEANINGS[facts.dominantTenGodGroup]);
  if (facts.mentalInteraction) add(facts.mentalInteraction, INTERACTION_PLAIN_MEANINGS[facts.mentalInteraction]);
  const selectedMonths = facts.monthlyCalendar.filter(month => facts.monthlyRelationMonths.some(selected => selected.ordinal === month.ordinal));
  if (facts.hasAnnualClash || selectedMonths.some(month => month.relations.some(relation => relation.relation === "clash"))) add("충", "서로 가려는 쪽이 달라 부딪히는 관계. 하던 일이나 약속을 바꿔야 할지 살피는 뜻.");
  if (facts.hasAnnualCombination || selectedMonths.some(month => month.relations.some(relation => relation.relation === "combination"))) add("합", "서로 이어지는 관계. 함께할 때 얻는 도움과 서로 맞춰야 할 일을 살피는 뜻.");
  add("일간", "태어난 날의 사주 글자 중 나의 성향을 읽는 글자.");
  add("원국", "태어난 때의 사주. 원래 어떤 성향인지 읽을 때 보는 것.");
  add("세운", "한 해 동안의 운세.");
  add("대운", "10년씩 이어지는 큰 운세. 올해보다 긴 시간을 보는 것.");
  add("월운", "한 달 동안의 운세.");
  if (facts.annualGanZhi === "丙午") add("병오", `${facts.targetYear}년을 사주에서 부르는 이름.`);
  if (facts.daYunGanZhi === "甲申") add("갑신", "지금 지나고 있는 10년간의 운세를 사주에서 부르는 이름.");
  return terms;
}
