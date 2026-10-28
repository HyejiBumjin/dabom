import assert from "node:assert/strict";
import { KoreanPolicyAdapter } from "../src/lib/saju/korean-policy-adapter";
import { extractReportFacts } from "../src/lib/saju/report-facts";
import { buildReportMonthPeriods } from "../src/lib/saju/report-months";
import type { Myeongsik } from "../src/lib/saju/myeongsik";

// Pure chart/calendar checks. No database, credentials, or model requests.
let checks = 0;
function check(name: string, run: () => void) {
  run();
  checks += 1;
  console.log(`PASS ${name}`);
}

const chart = new KoreanPolicyAdapter().calculate({ birthDate: "1995-05-20", birthTime: "20:20", gender: "female", calendar: "solar" });
const originalChart = JSON.stringify(chart);
const facts = extractReportFacts(chart);
const periods = buildReportMonthPeriods(2026);

check("solar-term ordinal one begins in February at the KST instant", () => {
  assert.deepEqual(periods[0], { ordinal: 1, calendarYear: 2026, calendarMonth: 2, startAt: "2026-02-04T05:02:08+09:00", endAt: "2026-03-05T22:59:00+09:00", displayLabel: "2월 4일~3월 5일" });
  assert.equal(Date.parse(periods[0].startAt), Date.parse("2026-02-04T04:02:08+08:00"));
  assert.equal(facts.monthlyCalendar[0].ganZhi, "庚寅");
  assert.equal(facts.monthlyCalendar[0].stemTenGod, "겁재");
});

check("Beijing-to-Korea conversion carries a midnight boundary into June 6", () => {
  assert.equal(periods[4].startAt, "2026-06-06T00:48:21+09:00");
  assert.equal(Date.parse(periods[4].startAt), Date.parse("2026-06-05T23:48:21+08:00"));
  assert.equal(periods[4].displayLabel, "6월 6일~7월 7일");
});

check("December and the twelfth solar-term month disclose the next calendar year", () => {
  assert.equal(periods[10].displayLabel, "12월 7일~2027년 1월 5일");
  assert.deepEqual(periods[11], { ordinal: 12, calendarYear: 2027, calendarMonth: 1, startAt: "2027-01-05T23:09:58+09:00", endAt: "2027-02-04T10:46:18+09:00", displayLabel: "2027년 1월 5일~2월 4일" });
  assert.equal(periods[11].endAt, buildReportMonthPeriods(2027)[0].startAt);
});

check("all twelve half-open periods are contiguous with an explicit KST offset", () => {
  assert.equal(periods.length, 12);
  for (const [index, period] of periods.entries()) {
    assert.equal(period.ordinal, index + 1);
    assert.match(period.startAt, /\+09:00$/u);
    assert.match(period.endAt, /\+09:00$/u);
    const duration = Date.parse(period.endAt) - Date.parse(period.startAt);
    assert(duration > 28 * 86_400_000 && duration < 33 * 86_400_000);
    if (index) assert.equal(periods[index - 1].endAt, period.startAt);
  }
});

check("one period retains every matching natal pillar, including repeated targets", () => {
  const first = facts.monthlyCalendar[0];
  assert.deepEqual(first.relations.map((relation) => [relation.targetPillar, relation.targetBranch, relation.relation]), [["year", "亥", "combination"], ["day", "亥", "combination"]]);
  const samePeriod = facts.monthlyRelationMonths.find((month) => month.ordinal === 1)!;
  assert.deepEqual(samePeriod.relations, first.relations);
  assert.equal(samePeriod.against, "亥");
});

check("representative periods are distributed and keep both combination and clash", () => {
  assert.deepEqual(facts.monthlyRelationMonths.map((month) => month.ordinal), [1, 7, 10]);
  const kinds = new Set(facts.monthlyRelationMonths.flatMap((month) => month.relations.map((relation) => relation.relation)));
  assert(kinds.has("combination") && kinds.has("clash"));
  assert.equal(facts.monthlyRelation, "clash", "legacy aggregate remains compatible");
  assert(facts.facts.find((fact) => fact.id === "monthly-relation")?.basis.includes("2월 4일~3월 5일"));
});

check("the same month can simultaneously combine, clash, and overlap", () => {
  const mixed = structuredClone(chart);
  mixed.pillars.year.earthlyBranch = "申";
  mixed.pillars.month.earthlyBranch = "亥";
  mixed.pillars.day.earthlyBranch = "亥";
  mixed.pillars.hour.earthlyBranch = "寅";
  // A small saved list is supported; it still preserves all kinds in its one month.
  mixed.fortune.monthly = [mixed.fortune.monthly[0]];
  const result = extractReportFacts(mixed);
  assert.equal(result.monthlyRelationMonths.length, 1);
  assert.deepEqual(result.monthlyRelationMonths[0].relations.map((relation) => [relation.targetPillar, relation.relation]), [["year", "clash"], ["month", "combination"], ["day", "combination"], ["hour", "overlap"]]);
  const clash = result.facts.find((fact) => fact.id === "monthly-1-clash")!;
  const combination = result.facts.find((fact) => fact.id === "monthly-1-combination")!;
  assert.equal(clash.value, "clash");
  assert.equal(combination.value, "combination");
  assert.match(clash.basis, /year 申 충/u);
  assert(!clash.basis.includes("合") && !clash.basis.includes(" 합"));
  assert.match(combination.basis, /month 亥 합.*day 亥 합/u);
  assert(!combination.basis.includes(" 충"));
  assert.match(combination.timeScope, /2026-02-04T05:02:08\+09:00 이상 2026-03-05T22:59:00\+09:00 미만/u);
});

check("month stem and month main hidden stem supply separate natal evidence", () => {
  assert.equal(facts.natalMonthTenGod, "비견");
  assert.equal(facts.natalMonthMainTenGod, "정관");
  assert.match(facts.facts.find((fact) => fact.id === "natal-month-ten-god")!.basis, /월간 辛/u);
  assert.match(facts.facts.find((fact) => fact.id === "natal-month-main-ten-god")!.basis, /월지 巳의 본기 지장간 丙/u);
});

check("annual clash and combination each retain distinct explicit natal grounds", () => {
  const annual = structuredClone(chart);
  annual.pillars.year.earthlyBranch = "子";
  annual.pillars.month.earthlyBranch = "未";
  const result = extractReportFacts(annual);
  assert(result.hasAnnualClash && result.hasAnnualCombination);
  assert.match(result.facts.find((fact) => fact.id === "annual-branch-clash")!.basis, /year 子 충/u);
  assert.match(result.facts.find((fact) => fact.id === "annual-branch-combination")!.basis, /month 未 합/u);
});

check("unknown birth time excludes all hour relations and frequency contributions", () => {
  const unknown = structuredClone(chart);
  unknown.input.birthTimeKnown = false;
  const before = extractReportFacts(unknown);
  unknown.pillars.hour = { ganZhi: "壬子", heavenlyStem: "壬", earthlyBranch: "子", hiddenStems: ["癸"], stemTenGod: "伤官", hiddenTenGods: Array(12).fill("伤官"), elementPair: "水水" };
  const after = extractReportFacts(unknown);
  assert.deepEqual(after, before, "a placeholder hour must not influence any report facts");
  assert(!after.hasAnnualClash, "the only annual clash is the unknown hour");
  const relations = [...after.natalBranchRelations, ...after.annualBranchRelations, ...after.daYunBranchRelations, ...after.monthlyCalendar.flatMap((month) => month.relations)];
  assert(relations.every((relation) => relation.targetPillar !== "hour"));
});

check("older stored charts with no birthTimeKnown flag remain readable", () => {
  const old = structuredClone(chart) as Myeongsik & { input: Partial<Myeongsik["input"]> };
  Reflect.deleteProperty(old.input, "birthTimeKnown");
  assert.deepEqual(extractReportFacts(old), facts);
});

check("selection is chronological and independent of storage array order or clock", () => {
  const reordered = structuredClone(chart);
  reordered.fortune.monthly.reverse();
  const originalNow = Date.now;
  try {
    Date.now = () => Date.parse("2027-01-20T00:00:00+09:00");
    assert.deepEqual(extractReportFacts(reordered), facts);
  } finally { Date.now = originalNow; }
});

check("extraction neither rewrites stored calculations nor exposes raw birth data", () => {
  assert.equal(JSON.stringify(chart), originalChart);
  const serialized = JSON.stringify(facts);
  assert(!serialized.includes(chart.input.localDateTime));
  assert(!serialized.includes("1995-05-20"));
  assert(!serialized.includes("20:20"));
});

console.log(`Report facts checks: ${checks} passed.`);
