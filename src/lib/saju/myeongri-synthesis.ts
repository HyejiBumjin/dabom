/**
 * 다봄 자체 계산 규칙. 기존 만세력의 확정된 간지에서만 파생한다.
 * 출처: public-domain 한문 원문 三命通會 卷二(인원·생극·십이궁),
 * https://zh.wikisource.org/wiki/三命通會/卷二
 * 滴天髓 寒暖·燥濕: https://zh.wikisource.org/wiki/滴天髓/16
 * 현대 번역문을 사용하지 않는다. 계절 지표는 조후용신 확정이 아니다.
 */
import type { Myeongsik, PillarName } from "./myeongsik";
import type { AdvancedMyeongri } from "./advanced-myeongri";
import { controls, hiddenStemsByBranch, produces, stem, tenGod, type Element } from "./myeongri-rules";

export const SYNTHESIS_RULE_VERSION = "synthesis-2026.1";
export const LIFE_STAGES = ["장생", "목욕", "관대", "임관", "제왕", "쇠", "병", "사", "묘", "절", "태", "양"] as const;
export type LifeStage = typeof LIFE_STAGES[number];
const BRANCHES = [..."子丑寅卯辰巳午未申酉戌亥"];
// 양간 순행·음간 역행, 화토동궁 관례. 다른 학파의 토 운성표와 혼용하지 않는다.
const BIRTH_BRANCH: Record<string, string> = { 甲: "亥", 乙: "午", 丙: "寅", 丁: "酉", 戊: "寅", 己: "酉", 庚: "巳", 辛: "子", 壬: "申", 癸: "卯" };
export function lifeStage(dayStem: string, branch: string): LifeStage {
  if (!Object.hasOwn(stem, dayStem) || !BRANCHES.includes(branch)) throw new Error("십이운성의 기준 간지가 올바르지 않습니다.");
  const direction = stem[dayStem].yang ? 1 : -1;
  return LIFE_STAGES[((BRANCHES.indexOf(branch) - BRANCHES.indexOf(BIRTH_BRANCH[dayStem])) * direction + 12) % 12];
}

export type ElementLink = "same" | "produces" | "produced-by" | "controls" | "controlled-by";
export function elementLink(from: Element, to: Element): ElementLink {
  if (from === to) return "same";
  if (produces[from] === to) return "produces";
  if (produces[to] === from) return "produced-by";
  return controls[from] === to ? "controls" : "controlled-by";
}
export interface StemLink {
  from: string; to: string; fromStem: string; toStem: string;
  relation: ElementLink; combination: boolean;
}
const COMBINATIONS = ["甲己", "乙庚", "丙辛", "丁壬", "戊癸"];
export interface MyeongriSynthesis {
  version: string;
  natal: {
    season: AdvancedMyeongri["strength"]["season"];
    roots: AdvancedMyeongri["strength"]["roots"];
    exposures: Array<{ stem: string; tenGod: string; hiddenAt: PillarName; main: boolean; visibleAt: PillarName[] }>;
    visible: Array<{ pillar: PillarName; stem: string; tenGod: string; rootedAt: PillarName[] }>;
  };
  stemLinks: StemLink[];
  annualEcho: { stem: string; tenGod: string; visibleAt: PillarName[]; hiddenAt: PillarName[] };
  climate: {
    method: "seasonal-indicators-only";
    thermal: "warm" | "cold" | "transitional";
    earthMoisture: "dry" | "damp" | "unspecified";
    fire: Array<{ pillar: PillarName; stem: string; layer: "visible" | "hidden" }>;
    water: Array<{ pillar: PillarName; stem: string; layer: "visible" | "hidden" }>;
    annualElement: Element;
    annualEffect: "warms" | "cools" | "indirect";
    seasonalDirection: "reinforces" | "counterbalances" | "undetermined";
  };
  lifeStages: Array<{ scope: "natal" | "annual" | "da-yun" | "monthly"; position: string; branch: string; stage: LifeStage; ordinal?: number }>;
}

export function extractMyeongriSynthesis(chart: Myeongsik, advanced: AdvancedMyeongri): MyeongriSynthesis {
  const known = (Object.entries(chart.pillars) as Array<[PillarName, Myeongsik["pillars"]["year"]]>)
    .filter(([name]) => name !== "hour" || chart.input.birthTimeKnown !== false);
  const visible = known.filter(([name]) => name !== "day");
  const annual = chart.fortune.yearly.find(item => item.year === chart.fortune.targetYear);
  const cycle = chart.fortune.daYun.find(item => item.startYear <= chart.fortune.targetYear && item.endYear >= chart.fortune.targetYear);
  if (!annual || !cycle) throw new Error("종합 해석의 세운·대운 근거가 없습니다.");
  const [annualStem, annualBranch] = [...annual.ganZhi];
  const [cycleStem, cycleBranch] = [...cycle.ganZhi];
  const link = (from: string, fromStem: string, to: string, toStem: string): StemLink => ({
    from, to, fromStem, toStem, relation: elementLink(stem[fromStem].element, stem[toStem].element),
    combination: COMBINATIONS.some(pair => pair === fromStem + toStem || pair === toStem + fromStem),
  });
  const natal: MyeongriSynthesis["natal"] = {
    season: advanced.strength.season, roots: advanced.strength.roots,
    exposures: known.flatMap(([pillar, value]) => (hiddenStemsByBranch[value.earthlyBranch] ?? []).flatMap((hidden, index) => {
      const visibleAt = visible.filter(([, candidate]) => candidate.heavenlyStem === hidden).map(([name]) => name);
      return visibleAt.length ? [{ stem: hidden, tenGod: tenGod(chart.dayMaster, hidden)!, hiddenAt: pillar, main: index === 0, visibleAt }] : [];
    })),
    visible: visible.map(([pillar, value]) => ({ pillar, stem: value.heavenlyStem, tenGod: tenGod(chart.dayMaster, value.heavenlyStem)!,
      rootedAt: known.filter(([, candidate]) => (hiddenStemsByBranch[candidate.earthlyBranch] ?? []).some(hidden => stem[hidden].element === stem[value.heavenlyStem].element)).map(([name]) => name) })),
  };
  const occurrences = known.flatMap(([pillar, value]) => [
    { pillar, stem: value.heavenlyStem, layer: "visible" as const },
    ...(hiddenStemsByBranch[value.earthlyBranch] ?? []).map(hidden => ({ pillar, stem: hidden, layer: "hidden" as const })),
  ]);
  const month = chart.pillars.month.earthlyBranch;
  const thermal = "巳午未".includes(month) ? "warm" : "亥子丑".includes(month) ? "cold" : "transitional";
  const annualElement = stem[annualStem].element;
  const annualEffect = annualElement === "fire" ? "warms" : annualElement === "water" ? "cools" : "indirect";
  const seasonalDirection = thermal === "transitional" || annualEffect === "indirect" ? "undetermined"
    : (thermal === "warm" && annualEffect === "warms") || (thermal === "cold" && annualEffect === "cools") ? "reinforces" : "counterbalances";
  return {
    version: SYNTHESIS_RULE_VERSION, natal,
    stemLinks: [link("da-yun", cycleStem, "annual", annualStem), link("annual", annualStem, "day", chart.dayMaster),
      ...visible.map(([name, value]) => link("annual", annualStem, `natal-${name}`, value.heavenlyStem))],
    annualEcho: { stem: annualStem, tenGod: tenGod(chart.dayMaster, annualStem)!,
      visibleAt: visible.filter(([, value]) => value.heavenlyStem === annualStem).map(([name]) => name),
      hiddenAt: known.filter(([, value]) => (hiddenStemsByBranch[value.earthlyBranch] ?? []).includes(annualStem)).map(([name]) => name) },
    climate: { method: "seasonal-indicators-only", thermal,
      earthMoisture: "未戌".includes(month) ? "dry" : "辰丑".includes(month) ? "damp" : "unspecified",
      fire: occurrences.filter(item => stem[item.stem].element === "fire"), water: occurrences.filter(item => stem[item.stem].element === "water"),
      annualElement, annualEffect, seasonalDirection },
    lifeStages: [
      ...known.map(([position, value]) => ({ scope: "natal" as const, position, branch: value.earthlyBranch, stage: lifeStage(chart.dayMaster, value.earthlyBranch) })),
      { scope: "annual", position: "annual", branch: annualBranch, stage: lifeStage(chart.dayMaster, annualBranch) },
      { scope: "da-yun", position: "da-yun", branch: cycleBranch, stage: lifeStage(chart.dayMaster, cycleBranch) },
      ...[...chart.fortune.monthly].sort((a, b) => a.ordinal - b.ordinal).map(item => ({ scope: "monthly" as const, position: `monthly-${item.ordinal}`, ordinal: item.ordinal, branch: [...item.ganZhi][1], stage: lifeStage(chart.dayMaster, [...item.ganZhi][1]) })),
    ],
  };
}
