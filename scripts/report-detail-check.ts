import assert from "node:assert/strict";
import { KoreanPolicyAdapter } from "../src/lib/saju/korean-policy-adapter";
import { buildReportRenderPayload } from "../src/lib/saju/report-payload";
import { buildReportMonthPeriods } from "../src/lib/saju/report-months";
import { TEN_GOD_MEANINGS } from "../src/lib/saju/report-detail-corpus";
import { getReportPrompt } from "../src/lib/prompts/v6";
import { MAX_REPORT_EMOTICONS, REPORT_EMOTICON_INSTRUCTIONS, REPORT_EMOTICON_RANGE } from "../src/lib/report-emoticons";
import { checkObservationContract } from "./testing/report-observations";
import type { Myeongsik } from "../src/lib/saju/myeongsik";

// End-to-end evidence assembly only: no persistence, accounts or model requests.
type Context = ReturnType<typeof buildReportRenderPayload>;
const adapter = new KoreanPolicyAdapter();
const chart = adapter.calculate({ birthDate: "1995-05-20", birthTime: "20:20", gender: "female", calendar: "solar" });
const originalChart = JSON.stringify(chart);
let checks = 0;

function check(name: string, run: () => void) {
  run();
  checks += 1;
  console.log(`PASS ${name}`);
}

function checkGrounds(context: Context) { checkObservationContract(context); }
function checkMonthPairs(context: Context) {
  for (const month of context.reportFacts.monthlyRelationMonths) {
    const observations = context.payload.observations;
    const period = observations.find(item => item.id === `monthly-${month.ordinal}`)!;
    assert(period);
    const owner = context.payload.sections.find(section => section.primary_evidence_ids.includes(period.id))!;
    const expected = context.reportFacts.advanced.relations.filter(relation => relation.scope === "monthly" && relation.members.some(member => member.ordinal === month.ordinal));
    for (const relation of expected) {
      const actual = observations.find(item => item.id === relation.id)!;
      assert.deepEqual(actual.value, relation);
      assert(owner.primary_evidence_ids.includes(actual.id), "A monthly relation escaped its period owner");
    }
    assert.deepEqual(context.payload.yearly_context.timing[(period.value as { timing_index: number }).timing_index].stem_ten_god, month.stemTenGod);
  }
}

check("60 real charts cover every day master and keep distinct natal/year evidence in the renderer", () => {
  const dayMasters = new Set<string>();
  const annualGods = new Set<string>();
  for (let offset = 0; offset < 60; offset += 1) {
    const birthDate = new Date(Date.UTC(1995, 4, 20 + offset)).toISOString().slice(0, 10);
    const calculated = adapter.calculate({ birthDate, birthTime: "20:20", gender: offset % 2 ? "male" : "female", calendar: "solar" });
    const context = buildReportRenderPayload(calculated, "genz");
    const { reportFacts, payload } = context;
    dayMasters.add(reportFacts.dayMaster);
    annualGods.add(reportFacts.annualTenGod);
    const essence = payload.sections.find(section => section.id === "essence")!;
    assert(essence.primary_evidence_ids.includes("natal-day-master"));
    assert(essence.context_evidence_ids.includes("annual-pillar"));
    assert.deepEqual(payload.observations.find(item => item.id === "natal-month-gods")!.value, { visible: reportFacts.natalMonthTenGod, mainHidden: reportFacts.natalMonthMainTenGod });
    for (const [id, value] of [["annual-pillar", reportFacts.annualTenGod], ["active-da-yun", reportFacts.daYunTenGod]]) {
      assert.equal((payload.observations.find(item => item.id === id)!.value as { stemTenGod: string }).stemTenGod, value);
    }
    const requiredGods = [...new Set([reportFacts.natalMonthTenGod, reportFacts.natalMonthMainTenGod, reportFacts.annualTenGod, reportFacts.daYunTenGod, ...reportFacts.monthlyRelationMonths.map(month => month.stemTenGod)])];
    const actualGods = new Set([...requiredGods, ...reportFacts.natalTenGodEvidence.map(item => item.tenGod)]);
    const godDefinitions = payload.terminology.filter(term => term.term in TEN_GOD_MEANINGS);
    assert.equal(new Set(godDefinitions.map(term => term.term)).size, godDefinitions.length, "Duplicated ten gods entered the reader glossary");
    for (const god of requiredGods) assert(godDefinitions.some(term => term.term === god), `A selected god lacks a reader-facing explanation: ${god}`);
    for (const { term } of godDefinitions) assert(actualGods.has(term), `Uncalculated ten god entered the glossary: ${term}`);
    for (const { term, meaning } of godDefinitions) {
      assert(meaning, `${term}: no reader-facing explanation`);
      assert(!/올해|너는|해야|좋아/u.test(meaning), `${term}: a canned prediction entered the definition`);
    }
    checkGrounds(context);
    checkMonthPairs(context);
    assert(!JSON.stringify(payload).includes(birthDate), "Raw birth date entered the renderer payload");
  }
  assert.equal(dayMasters.size, 10);
  assert.equal(annualGods.size, 10);
});

check("both annual combination and clash survive corpus ranking and payload assembly", () => {
  const mixed = structuredClone(chart);
  // Synthetic branches isolate simultaneous annual relationships.
  mixed.pillars.year.earthlyBranch = "子";
  mixed.pillars.month.earthlyBranch = "未";
  const context = buildReportRenderPayload(mixed);
  const annual = context.payload.observations.filter(item => item.scope === "annual" && item.kind === "branch-relation");
  for (const kind of ["clash", "combination"]) {
    assert(annual.some(item => (item.value as { kind: string }).kind === kind));
    assert.equal(context.reportFacts.facts.find(fact => fact.id === `annual-branch-${kind}`)?.value, `annual-${kind}`);
  }
  checkGrounds(context);
});

check("one monthly period keeps separate clash/combination evidence and all target pillars", () => {
  const mixed = structuredClone(chart);
  mixed.pillars.year.earthlyBranch = "申";
  mixed.pillars.month.earthlyBranch = "亥";
  mixed.pillars.day.earthlyBranch = "亥";
  mixed.pillars.hour.earthlyBranch = "寅";
  mixed.fortune.monthly = [mixed.fortune.monthly[0]];
  const context = buildReportRenderPayload(mixed);
  assert.equal(context.payload.yearly_context.timing.length, 1);
  assert.deepEqual(context.reportFacts.monthlyRelationMonths[0].relations.map(item => [item.targetPillar, item.relation]), [
    ["year", "clash"], ["month", "combination"], ["day", "combination"], ["hour", "overlap"],
  ]);
  assert(context.payload.observations.some(item => item.scope === "monthly" && item.kind === "branch-relation"));
  checkGrounds(context);
  checkMonthPairs(context);
});

function singleMonthChart(ordinal: number): Myeongsik {
  const result = structuredClone(chart);
  const month = result.fortune.monthly.find(item => item.ordinal === ordinal)!;
  const combination: Record<string, string> = { 子: "丑", 丑: "子", 寅: "亥", 卯: "戌", 辰: "酉", 巳: "申", 午: "未", 未: "午", 申: "巳", 酉: "辰", 戌: "卯", 亥: "寅" };
  result.pillars.year.earthlyBranch = combination[[...month.ganZhi][1]];
  result.fortune.monthly = [month];
  return result;
}

check("all 12 monthly phases switch exactly at inclusive start and exclusive end, including next year", () => {
  const originalNow = Date.now;
  try {
    for (const period of buildReportMonthPeriods(2026)) {
      const calculated = singleMonthChart(period.ordinal);
      const start = Date.parse(period.startAt);
      const end = Date.parse(period.endAt);
      for (const [instant, phase] of [[start - 1, "future"], [start, "current"], [end - 1, "current"], [end, "past"]] as const) {
        Date.now = () => instant;
        const context = buildReportRenderPayload(calculated);
        const timing = context.payload.yearly_context.timing[0];
        assert(timing, `No timing for ordinal ${period.ordinal}`);
        assert.equal(timing.phase, phase, `${period.displayLabel} at ${instant}`);
        assert.equal(timing.start_at, period.startAt);
        assert.equal(timing.end_at, period.endAt);
        assert.equal(timing.month, period.displayLabel);
        assert.equal(timing.calendar_year, period.calendarYear);
        assert.equal(timing.calendar_month, period.calendarMonth);
        const kst = new Date(instant + 9 * 60 * 60 * 1000);
        assert.deepEqual(context.payload.as_of, { year: kst.getUTCFullYear(), month: kst.getUTCMonth() + 1, instant: new Date(instant).toISOString() });
        if (period.ordinal === 11) assert.equal(timing.month, "12월 7일~2027년 1월 5일");
        if (period.ordinal === 12) {
          assert.equal(timing.calendar_year, 2027);
          assert.equal(timing.month, "2027년 1월 5일~2월 4일");
        }
        checkGrounds(context);
        checkMonthPairs(context);
      }
    }
  } finally { Date.now = originalNow; }
});

check("unknown birth time cannot add hour-based evidence to any rendered section", () => {
  const unknown = structuredClone(chart);
  unknown.input.birthTimeKnown = false;
  const before = buildReportRenderPayload(unknown);
  unknown.pillars.hour = { ganZhi: "壬子", heavenlyStem: "壬", earthlyBranch: "子", hiddenStems: ["癸"], stemTenGod: "伤官", hiddenTenGods: Array(12).fill("伤官"), elementPair: "水水" };
  const after = buildReportRenderPayload(unknown);
  assert.deepEqual(after.payload.sections, before.payload.sections);
  assert.deepEqual(after.payload.observations, before.payload.observations);
  checkGrounds(after);
});

check("detail does not reintroduce authored scenes or change 7–9 emoticons and messenger length", () => {
  const { payload } = buildReportRenderPayload(chart, "genz");
  assert.equal(REPORT_EMOTICON_RANGE, "7~9");
  assert.equal(MAX_REPORT_EMOTICONS, 9);
  assert(payload.style.speech.includes("전체 7~9개"));
  assert(payload.constraints.includes(REPORT_EMOTICON_INSTRUCTIONS));
  assert(getReportPrompt("genz").instructions.includes(REPORT_EMOTICON_INSTRUCTIONS));
  assert.deepEqual(payload.sections.map(section => section.paragraph_length.target), [230, 330, 380, 360, 330, 230]);
  assert.equal(payload.sections.find(section => section.id === "summary")!.primary_evidence_ids.length, 0);
  checkObservationContract({ payload, reportFacts: buildReportRenderPayload(chart).reportFacts });
  assert.equal(JSON.stringify(chart), originalChart, "Rendering mutated the stored chart");
});

console.log(`Report detail integration: ${checks} groups passed (60 real charts, 48 exact timing boundaries; no network/database calls).`);
