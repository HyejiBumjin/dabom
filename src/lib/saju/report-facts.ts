import { stem, hiddenStemsByBranch, tenGod } from "@/lib/saju/myeongri-rules";
import { extractAdvancedMyeongri, type AdvancedMyeongri } from "@/lib/saju/advanced-myeongri";
import { extractMyeongriSynthesis, type MyeongriSynthesis } from "./myeongri-synthesis";
import type { Myeongsik } from "@/lib/saju/myeongsik";
import { buildReportMonthPeriods, type ReportMonthPeriod } from "@/lib/saju/report-months";

export type ReportDomain = "essence" | "yearly" | "relation" | "career" | "mental" | "summary";
export type MonthlyRelation = "clash" | "combination" | "none";

export interface SajuFact {
  id: string;
  type: "day-master" | "ten-god" | "interaction" | "fortune" | "monthly-relation" | "structure";
  value: string;
  basis: string;
  timeScope: string;
}

export type BranchRelation = "clash" | "combination" | "overlap";
export interface BranchRelationFact {
  source: "natal" | "annual" | "da-yun" | "monthly";
  sourceGanZhi: string;
  sourceBranch: string;
  targetPillar: "year" | "month" | "day" | "hour";
  targetBranch: string;
  relation: BranchRelation;
}
export interface MonthlyCalendarFact extends ReportMonthPeriod {
  ganZhi: string;
  branch: string;
  stemTenGod: string;
  relations: BranchRelationFact[];
}
export interface MonthlyRelationMonth extends MonthlyCalendarFact {
  /** Legacy representative target; use relations for every target and kind. */
  against: string;
}

/** Locations, not weights: a count never establishes strength or a configuration. */
export interface NatalTenGodEvidence {
  tenGod: string;
  visibleAt: Array<"year" | "month" | "hour">;
  hiddenAt: Array<{ pillar: BranchRelationFact["targetPillar"]; stem: string; role: "main" | "secondary" }>;
}

export interface ReportFacts {
  advanced: AdvancedMyeongri;
  synthesis: MyeongriSynthesis;
  targetYear: number;
  dayMaster: string;
  annualGanZhi: string;
  annualTenGod: string;
  natalMonthTenGod: string;
  natalMonthMainTenGod: string;
  natalDayMainTenGod: string;
  natalTenGodEvidence: NatalTenGodEvidence[];
  daYunGanZhi: string;
  daYunTenGod: string;
  daYunHiddenTenGods: string[];
  dominantTenGodGroup: "비겁" | "식상" | "재성" | "관성" | "인성" | null;
  mentalInteraction: "화극금" | "수극화" | null;
  monthlyRelation: MonthlyRelation;
  monthlyRelationMonths: MonthlyRelationMonth[];
  monthlyCalendar: MonthlyCalendarFact[];
  natalBranchRelations: BranchRelationFact[];
  annualBranchRelations: BranchRelationFact[];
  daYunBranchRelations: BranchRelationFact[];
  hasNatalClash: boolean;
  hasAnnualClash: boolean;
  hasAnnualCombination: boolean;
  hasRepeatedNatalBranch: boolean;
  daYunNatalRelation: "clash" | "combination" | "overlap" | "none";
  annualDaYunTheme: "role-and-results" | "expression-and-results" | "year-and-cycle";
  careerPattern: "asset-with-peer" | "asset" | "responsibility" | "general";
  facts: SajuFact[];
}

const clashSet = new Set(["子午", "午子", "丑未", "未丑", "寅申", "申寅", "卯酉", "酉卯", "辰戌", "戌辰", "巳亥", "亥巳"]);
const combinationSet = new Set(["子丑", "丑子", "寅亥", "亥寅", "卯戌", "戌卯", "辰酉", "酉辰", "巳申", "申巳", "午未", "未午"]);
const godGroup: Record<string, NonNullable<ReportFacts["dominantTenGodGroup"]>> = { 比肩: "비겁", 劫财: "비겁", 食神: "식상", 伤官: "식상", 偏财: "재성", 正财: "재성", 偏官: "관성", 七杀: "관성", 正官: "관성", 偏印: "인성", 正印: "인성" };


function activeDaYun(myeongsik: Myeongsik) {
  return myeongsik.fortune.daYun.find((period) => period.startYear <= myeongsik.fortune.targetYear && myeongsik.fortune.targetYear <= period.endYear);
}

function knownNatalPillars(myeongsik: Myeongsik) {
  return (Object.entries(myeongsik.pillars) as Array<[BranchRelationFact["targetPillar"], Myeongsik["pillars"]["year"]]>)
    .filter(([name]) => name !== "hour" || myeongsik.input.birthTimeKnown !== false);
}

function natalTenGodEvidence(myeongsik: Myeongsik): NatalTenGodEvidence[] {
  const byGod = new Map<string, NatalTenGodEvidence>();
  const entry = (god: string) => {
    if (!byGod.has(god)) byGod.set(god, { tenGod: god, visibleAt: [], hiddenAt: [] });
    return byGod.get(god)!;
  };
  for (const [pillarName, pillar] of knownNatalPillars(myeongsik)) {
    // The day stem is the reference, not another occurrence of peer influence.
    const visible = pillarName === "day" ? null : tenGod(myeongsik.dayMaster, pillar.heavenlyStem);
    if (visible && pillarName !== "day") entry(visible).visibleAt.push(pillarName);
    for (const [index, hidden] of (hiddenStemsByBranch[pillar.earthlyBranch] ?? []).entries()) {
      const god = tenGod(myeongsik.dayMaster, hidden);
      if (god) entry(god).hiddenAt.push({ pillar: pillarName, stem: hidden, role: index === 0 ? "main" : "secondary" });
    }
  }
  return [...byGod.values()];
}

function branchRelation(left: string, right: string): BranchRelation | null {
  if (left === right) return "overlap";
  if (clashSet.has(`${left}${right}`)) return "clash";
  if (combinationSet.has(`${left}${right}`)) return "combination";
  return null;
}

function relationsAgainstNatal(source: BranchRelationFact["source"], sourceGanZhi: string, sourceBranch: string, myeongsik: Myeongsik): BranchRelationFact[] {
  return knownNatalPillars(myeongsik).flatMap(([targetPillar, pillar]) => {
    const relation = branchRelation(sourceBranch, pillar.earthlyBranch);
    return relation ? [{ source, sourceGanZhi, sourceBranch, targetPillar, targetBranch: pillar.earthlyBranch, relation }] : [];
  });
}

function natalRelations(myeongsik: Myeongsik): BranchRelationFact[] {
  const entries = knownNatalPillars(myeongsik);
  return entries.flatMap(([, left], index) => entries.slice(index + 1).flatMap(([rightName, right]) => {
    const relation = branchRelation(left.earthlyBranch, right.earthlyBranch);
    return relation ? [{ source: "natal", sourceGanZhi: left.ganZhi, sourceBranch: left.earthlyBranch, targetPillar: rightName, targetBranch: right.earthlyBranch, relation }] : [];
  }));
}

/**
 * With an explicit reading date, prefer the current and remaining periods.
 * No ambient clock: the same chart and reading date always select the same
 * evidence. Without a date, retain the full-year extraction used by fixtures.
 */
function selectRepresentativeMonths(calendar: MonthlyCalendarFact[], asOf?: Date): MonthlyRelationMonth[] {
  const instant = asOf?.getTime();
  if (instant !== undefined && !Number.isFinite(instant)) throw new Error("리포트 기준 시각이 올바르지 않습니다.");
  const remaining = instant === undefined ? [] : calendar.filter(month => Date.parse(month.endAt) > instant);
  // After the fortune year has ended, keep a clearly retrospective selection.
  // A period without a branch relation still has its calculated monthly god.
  const relevant = (months: MonthlyCalendarFact[]) => months.filter(month => month.relations.some(relation => relation.relation !== "overlap"));
  const beforeYear = instant !== undefined && calendar.length > 0 && instant < Date.parse(calendar[0].startAt);
  const candidates = remaining.length ? beforeYear && relevant(remaining).length >= 3 ? relevant(remaining) : remaining : relevant(calendar);
  const count = Math.min(3, candidates.length);
  if (!count) return [];
  let best: MonthlyCalendarFact[] = [];
  let bestScore: number[] = [];
  const score = (months: MonthlyCalendarFact[]) => {
    const kinds = new Set(months.flatMap((month) => month.relations.filter((relation) => relation.relation !== "overlap").map((relation) => relation.relation)));
    const ordinals = months.map((month) => month.ordinal);
    const gaps = ordinals.slice(1).map((ordinal, index) => ordinal - ordinals[index]);
    const includesCurrent = instant !== undefined && months.some(month => Date.parse(month.startAt) <= instant && instant < Date.parse(month.endAt));
    const inCalendarYear = instant === undefined || beforeYear ? 0 : months.filter(month => month.calendarYear === new Date(instant + 9 * 60 * 60 * 1000).getUTCFullYear()).length;
    return [Number(includesCurrent), inCalendarYear, kinds.size, new Set(months.map(month => month.stemTenGod)).size, new Set(ordinals.map((ordinal) => Math.floor((ordinal - 1) / 4))).size, gaps.length ? Math.min(...gaps) : 0, (ordinals.at(-1) ?? 0) - ordinals[0], new Set(months.flatMap((month) => month.relations.map((relation) => relation.targetPillar))).size];
  };
  const choose = (start: number, selected: MonthlyCalendarFact[]) => {
    if (selected.length === count) {
      const nextScore = score(selected);
      const difference = nextScore.map((value, index) => value - (bestScore[index] ?? -1)).find((value) => value !== 0);
      // Equal scores retain chronological enumeration as the deterministic tie-break.
      if (!best.length || (difference ?? 0) > 0) { best = selected; bestScore = nextScore; }
      return;
    }
    for (let index = start; index <= candidates.length - (count - selected.length); index += 1) choose(index + 1, [...selected, candidates[index]]);
  };
  choose(0, []);
  return best.map((month) => ({ ...month, against: month.relations.find((relation) => relation.relation !== "overlap")?.targetBranch ?? "" }));
}

/** Deterministic feature extraction. No interpretation prose is created here. */
export function extractReportFacts(myeongsik: Myeongsik, options: { asOf?: Date } = {}): ReportFacts {
  const targetYear = myeongsik.fortune.targetYear;
  const annual = myeongsik.fortune.yearly.find((item) => item.year === targetYear);
  const daYun = activeDaYun(myeongsik);
  const day = stem[myeongsik.dayMaster];
  if (!annual || !daYun || !day) throw new Error("facts 추출에 필요한 명식 데이터가 없습니다.");

  const [annualStem] = [...annual.ganZhi];
  const [daYunStem, daYunBranch] = [...daYun.ganZhi];
  const annualTenGod = tenGod(myeongsik.dayMaster, annualStem) ?? "미확인";
  const natalMonth = myeongsik.pillars.month;
  const natalMonthMainStem = hiddenStemsByBranch[natalMonth.earthlyBranch]?.[0];
  const natalMonthTenGod = tenGod(myeongsik.dayMaster, natalMonth.heavenlyStem) ?? "미확인";
  const natalMonthMainTenGod = tenGod(myeongsik.dayMaster, natalMonthMainStem ?? "") ?? "미확인";
  const natalDayMainStem = hiddenStemsByBranch[myeongsik.pillars.day.earthlyBranch]?.[0];
  const natalDayMainTenGod = tenGod(myeongsik.dayMaster, natalDayMainStem ?? "") ?? "미확인";
  const natalGodEvidence = natalTenGodEvidence(myeongsik);
  const daYunTenGod = tenGod(myeongsik.dayMaster, daYunStem) ?? "미확인";
  const daYunHiddenTenGods = (hiddenStemsByBranch[daYunBranch] ?? []).flatMap((hidden) => {
    const god = tenGod(myeongsik.dayMaster, hidden);
    return god ? [god] : [];
  });
  const groupCounts = new Map<NonNullable<ReportFacts["dominantTenGodGroup"]>, number>();
  for (const [, pillar] of knownNatalPillars(myeongsik)) {
    for (const god of [pillar.stemTenGod, ...pillar.hiddenTenGods]) {
      const group = godGroup[god];
      if (group) groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
    }
  }
  const dominant = [...groupCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const dominantTenGodGroup = dominant && dominant[1] >= 3 ? dominant[0] : null;
  const annualElement = stem[annualStem]?.element;
  const mentalInteraction = annualElement === "fire" && day.element === "metal" ? "화극금" : annualElement === "water" && day.element === "fire" ? "수극화" : null;
  const natalBranchRelations = natalRelations(myeongsik);
  const annualBranchRelations = relationsAgainstNatal("annual", annual.ganZhi, [...annual.ganZhi][1], myeongsik);
  const daYunBranchRelations = relationsAgainstNatal("da-yun", daYun.ganZhi, daYunBranch, myeongsik);
  const periods = buildReportMonthPeriods(targetYear);
  const monthlyCalendar = myeongsik.fortune.monthly.map((month): MonthlyCalendarFact => {
    const period = periods.find((candidate) => candidate.ordinal === month.ordinal);
    if (!period) throw new Error("월운 순번이 올바르지 않습니다.");
    const [monthStem, branch] = [...month.ganZhi];
    return { ...period, ganZhi: month.ganZhi, branch, stemTenGod: tenGod(myeongsik.dayMaster, monthStem) ?? "미확인", relations: relationsAgainstNatal("monthly", month.ganZhi, branch, myeongsik) };
  }).sort((left, right) => left.ordinal - right.ordinal);
  // Retain the legacy summary for corpus conditions, while each month carries
  // its complete relation list and the selected periods cover both kinds.
  const monthlyRelation: MonthlyRelation = monthlyCalendar.some((month) => month.relations.some((relation) => relation.relation === "clash")) ? "clash"
    : monthlyCalendar.some((month) => month.relations.some((relation) => relation.relation === "combination")) ? "combination" : "none";
  const monthlyRelationMonths = selectRepresentativeMonths(monthlyCalendar, options.asOf);
  const hasNatalClash = natalBranchRelations.some((relation) => relation.relation === "clash");
  const hasAnnualClash = annualBranchRelations.some((relation) => relation.relation === "clash");
  const hasAnnualCombination = annualBranchRelations.some((relation) => relation.relation === "combination");
  const hasRepeatedNatalBranch = natalBranchRelations.some((relation) => relation.relation === "overlap");
  const daYunNatalRelation = (daYunBranchRelations.find((relation) => relation.relation === "clash")?.relation
    ?? daYunBranchRelations.find((relation) => relation.relation === "combination")?.relation
    ?? daYunBranchRelations.find((relation) => relation.relation === "overlap")?.relation
    ?? "none") as ReportFacts["daYunNatalRelation"];
  const hasAsset = daYunTenGod === "정재" || daYunTenGod === "편재";
  const hasPeer = daYunHiddenTenGods.some((god) => god === "비견" || god === "겁재");
  const careerPattern = hasAsset && hasPeer ? "asset-with-peer" : hasAsset ? "asset" : daYunHiddenTenGods.some((god) => god === "정관" || god === "편관") ? "responsibility" : "general";
  const annualDaYunTheme: ReportFacts["annualDaYunTheme"] = (annualTenGod === "정관" || annualTenGod === "편관") && hasAsset
    ? "role-and-results"
    : (annualTenGod === "식신" || annualTenGod === "상관") && hasAsset
      ? "expression-and-results"
      : "year-and-cycle";

  const facts: SajuFact[] = [
    { id: "day-master", type: "day-master", value: myeongsik.dayMaster, basis: `일간 ${myeongsik.dayMaster}`, timeScope: "태어난 명식" },
    { id: "annual-ten-god", type: "ten-god", value: annualTenGod, basis: `${annual.ganZhi} 세운 천간 ${annualStem} ↔ 일간 ${myeongsik.dayMaster}`, timeScope: `${targetYear}년 세운` },
    { id: "natal-month-ten-god", type: "ten-god", value: natalMonthTenGod, basis: `원국 월간 ${natalMonth.heavenlyStem} ↔ 일간 ${myeongsik.dayMaster}`, timeScope: "태어난 명식" },
    { id: "natal-month-main-ten-god", type: "ten-god", value: natalMonthMainTenGod, basis: `원국 월지 ${natalMonth.earthlyBranch}의 본기 지장간 ${natalMonthMainStem ?? "미확인"} ↔ 일간 ${myeongsik.dayMaster}`, timeScope: "태어난 명식" },
    { id: "natal-day-main-ten-god", type: "ten-god", value: natalDayMainTenGod, basis: `원국 일지 ${myeongsik.pillars.day.earthlyBranch}의 본기 지장간 ${natalDayMainStem ?? "미확인"} ↔ 일간 ${myeongsik.dayMaster}`, timeScope: "태어난 명식; 관계에서 읽을 보조 관점이며 연애 상태나 배우자 판정이 아님" },
    { id: "da-yun-ten-god", type: "fortune", value: daYunTenGod, basis: `${daYun.ganZhi} 대운 천간 ${daYunStem} ↔ 일간 ${myeongsik.dayMaster}`, timeScope: `${daYun.startYear}–${daYun.endYear}년 대운` },
    { id: "career-pattern", type: "structure", value: careerPattern, basis: `${daYun.ganZhi} 대운 지장간의 십신: ${daYunHiddenTenGods.join("·") || "없음"}`, timeScope: `${daYun.startYear}–${daYun.endYear}년 대운` },
  ];
  for (const entry of natalGodEvidence) facts.push({
    id: `natal-god-${entry.tenGod}`, type: "ten-god", value: entry.tenGod,
    basis: [...entry.visibleAt.map(pillar => `원국 ${pillar} 천간`), ...entry.hiddenAt.map(hidden => `원국 ${hidden.pillar} 지장간 ${hidden.stem} (${hidden.role})`)].join(" · "),
    timeScope: "태어난 명식의 확인된 위치; 개수로 강약을 판정하지 않음",
  });
  if (dominantTenGodGroup) facts.push({ id: "dominant-ten-god-group", type: "structure", value: dominantTenGodGroup, basis: `원국 천간·지장간 집계 ${dominant[1]}회`, timeScope: "태어난 명식" });
  if (mentalInteraction) facts.push({ id: "mental-interaction", type: "interaction", value: mentalInteraction, basis: `${annual.ganZhi} 세운과 ${myeongsik.dayMaster} 일간의 오행 관계`, timeScope: `${targetYear}년 세운` });
  if (monthlyRelation !== "none") facts.push({ id: "monthly-relation", type: "monthly-relation", value: monthlyRelation, basis: monthlyRelationMonths.map((item) => `${item.displayLabel} ${item.ganZhi}: ${item.relations.map((relation) => `${relation.sourceBranch} ↔ 원국 ${relation.targetPillar} ${relation.targetBranch} ${relation.relation}`).join(", ")}`).join(" · "), timeScope: `${targetYear}년 입춘부터 다음 해 입춘 전까지의 월운` });
  for (const month of monthlyRelationMonths) {
    facts.push({ id: `monthly-${month.ordinal}-ten-god`, type: "ten-god", value: month.stemTenGod, basis: `${month.displayLabel} 월간 ${[...month.ganZhi][0]} ↔ 일간 ${myeongsik.dayMaster}`, timeScope: `${month.startAt} 이상 ${month.endAt} 미만 (한국시간)` });
    for (const kind of ["clash", "combination"] as const) {
      const relations = month.relations.filter((relation) => relation.relation === kind);
      if (relations.length) facts.push({ id: `monthly-${month.ordinal}-${kind}`, type: "monthly-relation", value: kind, basis: `${month.displayLabel} ${month.ganZhi}: ${relations.map((relation) => `${relation.sourceBranch} ↔ 원국 ${relation.targetPillar} ${relation.targetBranch} ${kind === "clash" ? "충" : "합"}`).join(" · ")}`, timeScope: `${month.startAt} 이상 ${month.endAt} 미만 (한국시간)` });
    }
  }
  if (hasAnnualClash) facts.push({ id: "annual-branch-clash", type: "interaction", value: "annual-clash", basis: annualBranchRelations.filter((relation) => relation.relation === "clash").map((relation) => `${annual.ganZhi} 세운 ${relation.sourceBranch} ↔ 원국 ${relation.targetPillar} ${relation.targetBranch} 충`).join(" · "), timeScope: `${targetYear}년 세운` });
  if (hasAnnualCombination) facts.push({ id: "annual-branch-combination", type: "interaction", value: "annual-combination", basis: annualBranchRelations.filter((relation) => relation.relation === "combination").map((relation) => `${annual.ganZhi} 세운 ${relation.sourceBranch} ↔ 원국 ${relation.targetPillar} ${relation.targetBranch} 합`).join(" · "), timeScope: `${targetYear}년 세운` });
  if (hasNatalClash) facts.push({ id: "natal-branch-clash", type: "structure", value: "natal-clash", basis: natalBranchRelations.filter((relation) => relation.relation === "clash").map((relation) => `${relation.sourceBranch} ↔ ${relation.targetPillar} ${relation.targetBranch}`).join(" · "), timeScope: "태어난 명식" });
  if (hasRepeatedNatalBranch) facts.push({ id: "natal-branch-overlap", type: "structure", value: "repeated-branch", basis: natalBranchRelations.filter((relation) => relation.relation === "overlap").map((relation) => `${relation.sourceBranch} ↔ ${relation.targetPillar} ${relation.targetBranch}`).join(" · "), timeScope: "태어난 명식" });
  if (daYunNatalRelation !== "none") facts.push({ id: "da-yun-branch-relation", type: "fortune", value: daYunNatalRelation, basis: daYunBranchRelations.map((relation) => `${daYun.ganZhi}의 ${relation.sourceBranch} ↔ ${relation.targetPillar} ${relation.targetBranch} ${relation.relation}`).join(" · "), timeScope: `${daYun.startYear}–${daYun.endYear}년 대운` });
  facts.push({ id: "annual-da-yun-theme", type: "structure", value: annualDaYunTheme, basis: `${annual.ganZhi} 세운 ${annualTenGod} + ${daYun.ganZhi} 대운 ${daYunTenGod}`, timeScope: `${targetYear}년과 현재 대운의 교차` });

  const advanced = extractAdvancedMyeongri(myeongsik);
  const synthesis = extractMyeongriSynthesis(myeongsik, advanced);
  return { advanced, synthesis, targetYear, dayMaster: myeongsik.dayMaster, annualGanZhi: annual.ganZhi, annualTenGod, natalMonthTenGod, natalMonthMainTenGod, natalDayMainTenGod, natalTenGodEvidence: natalGodEvidence, daYunGanZhi: daYun.ganZhi, daYunTenGod, daYunHiddenTenGods, dominantTenGodGroup, mentalInteraction, monthlyRelation, monthlyRelationMonths, monthlyCalendar, natalBranchRelations, annualBranchRelations, daYunBranchRelations, hasNatalClash, hasAnnualClash, hasAnnualCombination, hasRepeatedNatalBranch, daYunNatalRelation, annualDaYunTheme, careerPattern, facts };
}
