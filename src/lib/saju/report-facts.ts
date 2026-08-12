import type { Myeongsik } from "@/lib/saju/myeongsik";

export type ReportDomain = "essence" | "yearly" | "relation" | "career" | "mental" | "summary";
export type MonthlyRelation = "clash" | "combination" | "none";

export interface SajuFact {
  id: string;
  type: "day-master" | "ten-god" | "interaction" | "fortune" | "monthly-relation" | "structure";
  value: string;
  basis: string;
  timeScope: string;
}

export interface ReportFacts {
  targetYear: number;
  dayMaster: string;
  annualGanZhi: string;
  annualTenGod: string;
  daYunGanZhi: string;
  daYunTenGod: string;
  daYunHiddenTenGods: string[];
  dominantTenGodGroup: "비겁" | "식상" | "재성" | "관성" | "인성" | null;
  mentalInteraction: "화극금" | "수극화" | null;
  monthlyRelation: MonthlyRelation;
  monthlyRelationMonths: Array<{ ordinal: number; ganZhi: string; against: string }>;
  careerPattern: "asset-with-peer" | "asset" | "responsibility" | "general";
  facts: SajuFact[];
}

type Element = "wood" | "fire" | "earth" | "metal" | "water";
const stem: Record<string, { element: Element; yang: boolean }> = {
  甲: { element: "wood", yang: true }, 乙: { element: "wood", yang: false }, 丙: { element: "fire", yang: true }, 丁: { element: "fire", yang: false },
  戊: { element: "earth", yang: true }, 己: { element: "earth", yang: false }, 庚: { element: "metal", yang: true }, 辛: { element: "metal", yang: false },
  壬: { element: "water", yang: true }, 癸: { element: "water", yang: false },
};
const produces: Record<Element, Element> = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const controls: Record<Element, Element> = { wood: "earth", fire: "metal", earth: "water", metal: "wood", water: "fire" };
const hiddenStemsByBranch: Record<string, string[]> = {
  子: ["癸"], 丑: ["己", "癸", "辛"], 寅: ["甲", "丙", "戊"], 卯: ["乙"], 辰: ["戊", "乙", "癸"], 巳: ["丙", "戊", "庚"],
  午: ["丁", "己"], 未: ["己", "丁", "乙"], 申: ["庚", "壬", "戊"], 酉: ["辛"], 戌: ["戊", "辛", "丁"], 亥: ["壬", "甲"],
};
const clashSet = new Set(["子午", "午子", "丑未", "未丑", "寅申", "申寅", "卯酉", "酉卯", "辰戌", "戌辰", "巳亥", "亥巳"]);
const combinationSet = new Set(["子丑", "丑子", "寅亥", "亥寅", "卯戌", "戌卯", "辰酉", "酉辰", "巳申", "申巳", "午未", "未午"]);
const godGroup: Record<string, NonNullable<ReportFacts["dominantTenGodGroup"]>> = { 比肩: "비겁", 劫财: "비겁", 食神: "식상", 伤官: "식상", 偏财: "재성", 正财: "재성", 偏官: "관성", 七杀: "관성", 正官: "관성", 偏印: "인성", 正印: "인성" };

function tenGod(dayStem: string, compareStem: string) {
  const day = stem[dayStem];
  const compare = stem[compareStem];
  if (!day || !compare) return null;
  const samePolarity = day.yang === compare.yang;
  if (day.element === compare.element) return samePolarity ? "비견" : "겁재";
  if (produces[day.element] === compare.element) return samePolarity ? "식신" : "상관";
  if (controls[day.element] === compare.element) return samePolarity ? "편재" : "정재";
  if (controls[compare.element] === day.element) return samePolarity ? "편관" : "정관";
  if (produces[compare.element] === day.element) return samePolarity ? "편인" : "정인";
  return null;
}

function activeDaYun(myeongsik: Myeongsik) {
  return myeongsik.fortune.daYun.find((period) => period.startYear <= myeongsik.fortune.targetYear && myeongsik.fortune.targetYear <= period.endYear);
}

function collectMonthlyRelation(myeongsik: Myeongsik, relation: Set<string>) {
  const branches = Object.values(myeongsik.pillars).map((pillar) => pillar.earthlyBranch);
  return myeongsik.fortune.monthly.flatMap((month) => {
    const branch = [...month.ganZhi][1];
    const against = branches.find((natal) => relation.has(`${branch}${natal}`));
    return against ? [{ ordinal: month.ordinal, ganZhi: month.ganZhi, against }] : [];
  });
}

/** Deterministic feature extraction. No interpretation prose is created here. */
export function extractReportFacts(myeongsik: Myeongsik): ReportFacts {
  const targetYear = myeongsik.fortune.targetYear;
  const annual = myeongsik.fortune.yearly.find((item) => item.year === targetYear);
  const daYun = activeDaYun(myeongsik);
  const day = stem[myeongsik.dayMaster];
  if (!annual || !daYun || !day) throw new Error("facts 추출에 필요한 명식 데이터가 없습니다.");

  const [annualStem] = [...annual.ganZhi];
  const [daYunStem, daYunBranch] = [...daYun.ganZhi];
  const annualTenGod = tenGod(myeongsik.dayMaster, annualStem) ?? "미확인";
  const daYunTenGod = tenGod(myeongsik.dayMaster, daYunStem) ?? "미확인";
  const daYunHiddenTenGods = (hiddenStemsByBranch[daYunBranch] ?? []).flatMap((hidden) => {
    const god = tenGod(myeongsik.dayMaster, hidden);
    return god ? [god] : [];
  });
  const groupCounts = new Map<NonNullable<ReportFacts["dominantTenGodGroup"]>, number>();
  for (const pillar of Object.values(myeongsik.pillars)) {
    for (const god of [pillar.stemTenGod, ...pillar.hiddenTenGods]) {
      const group = godGroup[god];
      if (group) groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
    }
  }
  const dominant = [...groupCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const dominantTenGodGroup = dominant && dominant[1] >= 3 ? dominant[0] : null;
  const annualElement = stem[annualStem]?.element;
  const mentalInteraction = annualElement === "fire" && day.element === "metal" ? "화극금" : annualElement === "water" && day.element === "fire" ? "수극화" : null;
  const clashes = collectMonthlyRelation(myeongsik, clashSet);
  const combinations = collectMonthlyRelation(myeongsik, combinationSet);
  const monthlyRelation: MonthlyRelation = clashes.length ? "clash" : combinations.length ? "combination" : "none";
  const monthlyRelationMonths = monthlyRelation === "clash" ? clashes : monthlyRelation === "combination" ? combinations : [];
  const hasAsset = daYunTenGod === "정재" || daYunTenGod === "편재";
  const hasPeer = daYunHiddenTenGods.some((god) => god === "비견" || god === "겁재");
  const careerPattern = hasAsset && hasPeer ? "asset-with-peer" : hasAsset ? "asset" : daYunHiddenTenGods.some((god) => god === "정관" || god === "편관") ? "responsibility" : "general";

  const facts: SajuFact[] = [
    { id: "day-master", type: "day-master", value: myeongsik.dayMaster, basis: `일간 ${myeongsik.dayMaster}`, timeScope: "태어난 명식" },
    { id: "annual-ten-god", type: "ten-god", value: annualTenGod, basis: `${annual.ganZhi} 세운 천간 ${annualStem} ↔ 일간 ${myeongsik.dayMaster}`, timeScope: `${targetYear}년 세운` },
    { id: "da-yun-ten-god", type: "fortune", value: daYunTenGod, basis: `${daYun.ganZhi} 대운 천간 ${daYunStem} ↔ 일간 ${myeongsik.dayMaster}`, timeScope: `${daYun.startYear}–${daYun.endYear}년 대운` },
    { id: "career-pattern", type: "structure", value: careerPattern, basis: `${daYun.ganZhi} 대운 지장간의 십신: ${daYunHiddenTenGods.join("·") || "없음"}`, timeScope: `${daYun.startYear}–${daYun.endYear}년 대운` },
  ];
  if (dominantTenGodGroup) facts.push({ id: "dominant-ten-god-group", type: "structure", value: dominantTenGodGroup, basis: `원국 천간·지장간 집계 ${dominant[1]}회`, timeScope: "태어난 명식" });
  if (mentalInteraction) facts.push({ id: "mental-interaction", type: "interaction", value: mentalInteraction, basis: `${annual.ganZhi} 세운과 ${myeongsik.dayMaster} 일간의 오행 관계`, timeScope: `${targetYear}년 세운` });
  if (monthlyRelation !== "none") facts.push({ id: "monthly-relation", type: "monthly-relation", value: monthlyRelation, basis: monthlyRelationMonths.map((item) => `${item.ordinal}월 ${item.ganZhi} ↔ 원국 ${item.against}`).join(" · "), timeScope: `${targetYear}년 월운` });

  return { targetYear, dayMaster: myeongsik.dayMaster, annualGanZhi: annual.ganZhi, annualTenGod, daYunGanZhi: daYun.ganZhi, daYunTenGod, daYunHiddenTenGods, dominantTenGodGroup, mentalInteraction, monthlyRelation, monthlyRelationMonths, careerPattern, facts };
}
