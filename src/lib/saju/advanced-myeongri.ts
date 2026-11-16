/**
 * Dabom interpretation rules, independently authored. Not a calendar engine.
 * Public-domain sources and application-specific conventions are documented in
 * docs/myeongri-advanced-rules.md. No copyrighted translations are imported.
 * Observed relations are separated from conditional interpretive candidates.
 */
import type { Myeongsik, PillarName } from "./myeongsik";
import { controls, hiddenStemsByBranch, produces, stem, tenGod, type Element } from "./myeongri-rules";

export const ADVANCED_RULE_VERSION = "myeongri-2026.1";
export type EvidenceScope = "natal" | "annual" | "da-yun" | "monthly";
export interface BranchPosition {
  id: string;
  scope: EvidenceScope;
  branch: string;
  stem: string;
  pillar?: PillarName;
  ordinal?: number;
}
export type RelationKind = "combination" | "clash" | "harm" | "break" | "punishment" | "self-punishment" | "triple-punishment" | "trine" | "seasonal-union";
export interface AdvancedRelation {
  id: string;
  scope: EvidenceScope;
  kind: RelationKind;
  /** A two-member encounter never claims that all three branches are present. */
  completeness: "pair" | "partial-triple" | "complete-triple";
  members: BranchPosition[];
  rule: string;
}
export type ShinsalName = "천을귀인" | "역마" | "도화" | "화개";
export interface ShinsalEvidence {
  id: string;
  name: ShinsalName;
  scope: EvidenceScope;
  target: BranchPosition;
  anchors: Array<{ pillar: "year" | "day"; value: string }>;
  rule: string;
}
export interface StrengthEvidence {
  id: string;
  status: "candidate" | "undetermined";
  tendency: "strong" | "weak" | "mixed";
  season: { monthBranch: string; element: Element; state: "왕" | "상" | "휴" | "수" | "사"; supports: boolean };
  roots: Array<{ pillar: PillarName; stem: string; main: boolean; contested: boolean }>;
  visibleSupport: Array<{ pillar: PillarName; stem: string; role: "peer" | "resource" }>;
  visibleDrain: Array<{ pillar: PillarName; stem: string; tenGod: string }>;
  blockers: string[];
  method: "season-roots-visible-agreement";
}
export interface PatternEvidence {
  id: string;
  status: "candidate" | "undetermined";
  monthBranch: string;
  candidates: Array<{ name: string; tenGod: string; stem: string; basis: "main-exposed" | "secondary-exposed" | "month-lu" | "month-blade" | "month-peer"; exposedAt: PillarName[] }>;
  blockers: string[];
  /** A month-order reference, never a claim of 成格 / 破格 / rank. */
  method: "month-order-exposure";
}
export interface YongshinEvidence {
  id: string;
  status: "conditional" | "undetermined";
  method: "eokbu-only";
  candidates: Array<{ element: Element; role: "resource" | "peer" | "output"; reason: string }>;
  blockers: string[];
}
export interface AdvancedMyeongri {
  version: string;
  birthTimeKnown: boolean;
  relations: AdvancedRelation[];
  shinsal: ShinsalEvidence[];
  strength: StrengthEvidence;
  pattern: PatternEvidence;
  yongshin: YongshinEvidence;
}

const PAIRS = {
  combination: ["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"],
  clash: ["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"],
  harm: ["子未", "丑午", "寅巳", "卯辰", "申亥", "酉戌"],
  // Conventional six-break table. Do not attribute it to 三命通會's 六害 chapter.
  break: ["子酉", "丑辰", "寅亥", "卯午", "巳申", "未戌"],
} as const;
const TRIPLE_PUNISHMENTS = ["寅巳申", "丑戌未"];
const TRINES = ["申子辰", "亥卯未", "寅午戌", "巳酉丑"];
const SEASONAL_UNIONS = ["寅卯辰", "巳午未", "申酉戌", "亥子丑"];
const STEM_COMBINATIONS = ["甲己", "乙庚", "丙辛", "丁壬", "戊癸"];
const LU: Record<string, string> = { 甲: "寅", 乙: "卯", 丙: "巳", 丁: "午", 戊: "巳", 己: "午", 庚: "申", 辛: "酉", 壬: "亥", 癸: "子" };
const YANG_BLADE: Record<string, string> = { 甲: "卯", 丙: "午", 戊: "午", 庚: "酉", 壬: "子" };
const NOBLE: Record<string, string> = { 甲: "丑未", 戊: "丑未", 庚: "丑未", 乙: "子申", 己: "子申", 丙: "酉亥", 丁: "酉亥", 壬: "卯巳", 癸: "卯巳", 辛: "寅午" };
const STAR_GROUPS = [
  { group: "申子辰", 역마: "寅", 도화: "酉", 화개: "辰" },
  { group: "寅午戌", 역마: "申", 도화: "卯", 화개: "戌" },
  { group: "巳酉丑", 역마: "亥", 도화: "午", 화개: "丑" },
  { group: "亥卯未", 역마: "巳", 도화: "子", 화개: "未" },
];
const pairMatches = (pair: string, a: string, b: string) => a !== b && pair.includes(a) && pair.includes(b);

/** Returns every coexisting relation; 六合 does not erase 害/破/刑. */
export function findAdvancedRelations(positions: BranchPosition[], scope: EvidenceScope, requiredId?: string): AdvancedRelation[] {
  const result: AdvancedRelation[] = [];
  const add = (kind: RelationKind, members: BranchPosition[], rule: string, completeness: AdvancedRelation["completeness"] = "pair") => {
    if (requiredId && !members.some(member => member.id === requiredId)) return;
    result.push({ id: `advanced-${scope}-${kind}-${members.map(member => member.id).sort().join("_")}`, scope, kind, completeness, members, rule });
  };
  positions.forEach((a, index) => positions.slice(index + 1).forEach(b => {
    for (const [kind, pairs] of Object.entries(PAIRS)) for (const pair of pairs) {
      if (pairMatches(pair, a.branch, b.branch)) add(kind as RelationKind, [a, b], `six-${kind}:${pair}`);
    }
    if (pairMatches("子卯", a.branch, b.branch)) add("punishment", [a, b], "punishment:子卯");
    if (a.branch === b.branch && "辰午酉亥".includes(a.branch)) add("self-punishment", [a, b], `self-punishment:${a.branch}`);
    for (const group of TRIPLE_PUNISHMENTS) {
      if (pairMatches(group, a.branch, b.branch)) add("punishment", [a, b], `triple-pair:${group}`, "partial-triple");
    }
  }));
  for (const [kind, groups] of [["triple-punishment", TRIPLE_PUNISHMENTS], ["trine", TRINES], ["seasonal-union", SEASONAL_UNIONS]] as const) {
    for (const group of groups) {
      const [a, b, c] = [...group].map(branch => positions.filter(position => position.branch === branch));
      for (const first of a) for (const second of b) for (const third of c) add(kind, [first, second, third], `${kind}:${group}`, "complete-triple");
    }
  }
  return result;
}

function calculateShinsal(natal: BranchPosition[], targets: BranchPosition[], dayStem: string): ShinsalEvidence[] {
  const result: ShinsalEvidence[] = [];
  for (const target of targets) {
    if (NOBLE[dayStem]?.includes(target.branch)) result.push({
      id: `advanced-shinsal-천을귀인-${target.id}`, name: "천을귀인", scope: target.scope, target,
      anchors: [{ pillar: "day", value: dayStem }], rule: "noble-day-stem-common-table",
    });
    for (const name of ["역마", "도화", "화개"] as const) {
      const anchors = natal.filter(position => position.pillar === "year" || position.pillar === "day").filter(anchor => STAR_GROUPS.find(group => group.group.includes(anchor.branch))?.[name] === target.branch)
        .map(anchor => ({ pillar: anchor.pillar as "year" | "day", value: anchor.branch }));
      if (anchors.length) result.push({ id: `advanced-shinsal-${name}-${target.id}`, name, scope: target.scope, target, anchors, rule: "year-and-day-branch-separate-anchors" });
    }
  }
  return result;
}

function structuralBlockers(chart: Myeongsik, natal: BranchPosition[], relations: AdvancedRelation[]): string[] {
  const blockers: string[] = [];
  if (chart.input.birthTimeKnown === false) blockers.push("birth-time-unknown");
  if (relations.some(relation => relation.kind === "trine" || relation.kind === "seasonal-union")) blockers.push("complete-branch-group-needs-transformation-review");
  const day = natal.find(position => position.pillar === "day")!;
  if (natal.some(other => other.id !== day.id && STEM_COMBINATIONS.some(pair => pairMatches(pair, day.stem, other.stem)))) blockers.push("day-stem-combination-needs-review");
  return blockers;
}

function calculateStrength(chart: Myeongsik, natal: BranchPosition[], natalRelations: AdvancedRelation[]): StrengthEvidence {
  const day = stem[chart.dayMaster].element;
  const monthBranch = chart.pillars.month.earthlyBranch;
  const seasonElement = stem[hiddenStemsByBranch[monthBranch][0]].element;
  const supports = seasonElement === day || produces[seasonElement] === day;
  const state = seasonElement === day ? "왕" : produces[seasonElement] === day ? "상" : produces[day] === seasonElement ? "휴" : controls[day] === seasonElement ? "수" : "사";
  const roots = natal.flatMap(position => hiddenStemsByBranch[position.branch].flatMap((hidden, index) => stem[hidden].element === day
    ? [{ pillar: position.pillar!, stem: hidden, main: index === 0, contested: natalRelations.some(relation => relation.kind === "clash" && relation.members.some(member => member.id === position.id)) }] : []));
  const visibleSupport = natal.filter(position => position.pillar !== "day").flatMap(position => {
    const element = stem[position.stem].element;
    const role = element === day ? "peer" as const : produces[element] === day ? "resource" as const : null;
    return role ? [{ pillar: position.pillar!, stem: position.stem, role }] : [];
  });
  const visibleDrain = natal.filter(position => position.pillar !== "day" && !visibleSupport.some(support => support.pillar === position.pillar))
    .map(position => ({ pillar: position.pillar!, stem: position.stem, tenGod: tenGod(chart.dayMaster, position.stem)! }));
  const blockers = structuralBlockers(chart, natal, natalRelations);
  if (natal.some((position, index) => natal.slice(index + 1).some(other => STEM_COMBINATIONS.some(pair => pairMatches(pair, position.stem, other.stem))))) blockers.push("visible-stem-combination-needs-review");
  if ("辰戌丑未".includes(monthBranch)) blockers.push("earth-month-command-not-resolved");
  if (!roots.length && !visibleSupport.length) blockers.push("rootless-chart-needs-special-pattern-review");
  // Agreement gates are an explicit application heuristic, NOT a classical
  // percentage, luck score, or a consensus between competing schools.
  let tendency: StrengthEvidence["tendency"] = "mixed";
  if (!blockers.length && supports && roots.some(root => root.main && !root.contested) && visibleSupport.length >= 1) tendency = "strong";
  if (!blockers.length && !supports && !roots.some(root => root.main) && visibleSupport.length <= 1) tendency = "weak";
  return { id: "advanced-strength", status: tendency === "mixed" ? "undetermined" : "candidate", tendency, season: { monthBranch, element: seasonElement, state, supports }, roots, visibleSupport, visibleDrain, blockers, method: "season-roots-visible-agreement" };
}

function calculatePattern(chart: Myeongsik, natal: BranchPosition[], natalRelations: AdvancedRelation[]): PatternEvidence {
  const monthBranch = chart.pillars.month.earthlyBranch;
  const hidden = hiddenStemsByBranch[monthBranch];
  const blockers = structuralBlockers(chart, natal, natalRelations);
  const month = natal.find(position => position.pillar === "month")!;
  if (natalRelations.some(relation => ["clash", "combination"].includes(relation.kind) && relation.members.some(member => member.id === month.id))) blockers.push("month-branch-interaction-needs-review");
  if (natal.some(other => other.id !== month.id && STEM_COMBINATIONS.some(pair => pairMatches(pair, month.stem, other.stem)))) blockers.push("month-stem-combination-needs-review");
  const exposed = (hiddenStem: string) => natal.filter(position => position.pillar !== "day" && position.stem === hiddenStem).map(position => position.pillar!);
  let candidates: PatternEvidence["candidates"] = [];
  if (LU[chart.dayMaster] === monthBranch) candidates = [{ name: "건록격", tenGod: "비견", stem: chart.dayMaster, basis: "month-lu", exposedAt: exposed(chart.dayMaster) }];
  else if (YANG_BLADE[chart.dayMaster] === monthBranch) {
    // 戊's blade is 午, whose 丁 main qi is an 印, not 劫財. Its 己 is
    // the actual peer-polarity counterpart; never label 丁 as 劫財.
    const bladeStem = hidden.find(value => tenGod(chart.dayMaster, value) === "겁재")!;
    candidates = [{ name: "양인격", tenGod: "겁재", stem: bladeStem, basis: "month-blade", exposedAt: exposed(bladeStem) }];
  }
  else if (["비견", "겁재"].includes(tenGod(chart.dayMaster, hidden[0])!)) candidates = [{ name: "월겁격", tenGod: tenGod(chart.dayMaster, hidden[0])!, stem: hidden[0], basis: "month-peer", exposedAt: exposed(hidden[0]) }];
  else candidates = hidden.flatMap((hiddenStem, index) => {
    const exposedAt = exposed(hiddenStem);
    const god = tenGod(chart.dayMaster, hiddenStem)!;
    return exposedAt.length && !["비견", "겁재"].includes(god) ? [{ name: god === "편관" ? "칠살격" : `${god}격`, tenGod: god, stem: hiddenStem, basis: index === 0 ? "main-exposed" as const : "secondary-exposed" as const, exposedAt }] : [];
  });
  if (!candidates.length) blockers.push("month-hidden-stem-not-exposed");
  if (candidates.length > 1) blockers.push("multiple-exposed-month-candidates");
  return { id: "advanced-pattern", status: candidates.length === 1 && !blockers.length ? "candidate" : "undetermined", monthBranch, candidates, blockers, method: "month-order-exposure" };
}

function calculateYongshin(day: Element, strength: StrengthEvidence): YongshinEvidence {
  const blockers = [...strength.blockers];
  if (strength.status !== "candidate") blockers.push("strength-not-resolved");
  const candidates: YongshinEvidence["candidates"] = blockers.length ? [] : strength.tendency === "weak"
    ? [{ element: (Object.keys(produces) as Element[]).find(element => produces[element] === day)!, role: "resource", reason: "도움을 받아 일간을 생하는 방향" }, { element: day, role: "peer", reason: "같은 오행의 지지를 보충하는 방향" }]
    : [{ element: produces[day], role: "output", reason: "일간이 생하는 쪽으로 힘을 써서 설기하는 방향" }];
  return { id: "advanced-yongshin", status: candidates.length ? "conditional" : "undetermined", method: "eokbu-only", candidates, blockers };
}

/** Derive from v1 saved charts as well as fresh charts; never mutate Myeongsik. */
export function extractAdvancedMyeongri(chart: Myeongsik): AdvancedMyeongri {
  const natal: BranchPosition[] = (["year", "month", "day", "hour"] as PillarName[]).map(name => [name, chart.pillars[name]] as const)
    .filter(([name]) => name !== "hour" || chart.input.birthTimeKnown !== false)
    .map(([pillar, value]) => ({ id: `natal-${pillar}`, scope: "natal", pillar, branch: value.earthlyBranch, stem: value.heavenlyStem }));
  if (natal.some(position => !stem[position.stem] || !hiddenStemsByBranch[position.branch]) || !stem[chart.dayMaster] || chart.dayMaster !== chart.pillars.day.heavenlyStem) throw new Error("심화 해석의 간지 근거가 올바르지 않습니다.");
  const targetYear = chart.fortune.targetYear;
  const annual = chart.fortune.yearly.find(period => period.year === targetYear);
  const cycle = chart.fortune.daYun.find(period => period.startYear <= targetYear && targetYear <= period.endYear);
  if (!annual || !cycle) throw new Error("심화 해석에 필요한 올해·대운 근거가 없습니다.");
  const period = (scope: EvidenceScope, ganZhi: string, ordinal?: number): BranchPosition => {
    const [heavenlyStem, branch] = [...ganZhi];
    if (!stem[heavenlyStem] || !hiddenStemsByBranch[branch]) throw new Error("심화 해석의 운 간지가 올바르지 않습니다.");
    return { id: ordinal ? `${scope}-${ordinal}` : scope, scope, stem: heavenlyStem, branch, ...(ordinal ? { ordinal } : {}) };
  };
  const annualPosition = period("annual", annual.ganZhi);
  const cyclePosition = period("da-yun", cycle.ganZhi);
  if (chart.fortune.monthly.some(month => !Number.isInteger(month.ordinal) || month.ordinal < 1 || month.ordinal > 12) || new Set(chart.fortune.monthly.map(month => month.ordinal)).size !== chart.fortune.monthly.length) throw new Error("심화 해석의 월운 순번이 올바르지 않습니다.");
  const months = [...chart.fortune.monthly].sort((a, b) => a.ordinal - b.ordinal).map(month => period("monthly", month.ganZhi, month.ordinal));
  const natalRelations = findAdvancedRelations(natal, "natal");
  const relations = [
    ...natalRelations,
    ...findAdvancedRelations([...natal, cyclePosition], "da-yun", cyclePosition.id),
    ...findAdvancedRelations([...natal, cyclePosition, annualPosition], "annual", annualPosition.id),
    ...months.flatMap(month => findAdvancedRelations([...natal, cyclePosition, annualPosition, month], "monthly", month.id)),
  ];
  const strength = calculateStrength(chart, natal, natalRelations);
  return {
    version: ADVANCED_RULE_VERSION, birthTimeKnown: chart.input.birthTimeKnown !== false, relations,
    shinsal: calculateShinsal(natal, [...natal, cyclePosition, annualPosition, ...months], chart.dayMaster),
    strength, pattern: calculatePattern(chart, natal, natalRelations), yongshin: calculateYongshin(stem[chart.dayMaster].element, strength),
  };
}
