import assert from "node:assert/strict";
import { KoreanPolicyAdapter } from "../src/lib/saju/korean-policy-adapter";
import { buildReportRenderPayload } from "../src/lib/saju/report-payload";
import { buildReportMonthPeriods } from "../src/lib/saju/report-months";
import { TEN_GOD_MEANINGS } from "../src/lib/saju/report-detail-corpus";
import { getReportPrompt } from "../src/lib/prompts/v6";
import { MAX_REPORT_EMOTICONS, REPORT_EMOTICON_INSTRUCTIONS, REPORT_EMOTICON_RANGE } from "../src/lib/report-emoticons";
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

function checkGrounds(context: Context) {
  const ids = context.reportFacts.facts.map(fact => fact.id);
  assert.equal(new Set(ids).size, ids.length, "Fact IDs must remain unambiguous");
  for (const section of context.selected.sections) {
    assert.equal(new Set(section.fragments.map(fragment => fragment.id)).size, section.fragments.length, `${section.id}: duplicate evidence`);
    const serialized = context.payload.sections.find(item => item.id === section.id)!;
    assert.deepEqual(serialized.fragments.map(fragment => fragment.grounds), section.fragments.map(fragment => fragment.grounds));
    for (const fragment of section.fragments) {
      assert.equal(fragment.status, "approved");
      for (const ground of fragment.grounds) assert(ids.includes(ground), `${section.id}/${fragment.id}: missing ${ground}`);
    }
  }
  assert.deepEqual(context.payload.facts, context.reportFacts.facts);
}

function checkMonthPairs(context: Context) {
  const relation = context.selected.sections.find(section => section.id === "relation")!;
  const serialized = context.payload.sections.find(section => section.id === "relation")!;
  const expected: string[] = [];
  for (const month of context.reportFacts.monthlyRelationMonths) {
    for (const kind of ["clash", "combination"] as const) {
      const targets = month.relations.filter(item => item.relation === kind);
      if (!targets.length) continue;
      const ground = `monthly-${month.ordinal}-${kind}`;
      const godGround = `monthly-${month.ordinal}-ten-god`;
      expected.push(ground, godGround);
      const fragment = relation.fragments.find(item => item.grounds.includes(ground));
      assert(fragment, `${month.displayLabel}: missing ${kind}`);
      assert.deepEqual([...fragment.grounds].sort(), [ground, godGround].sort(), "A monthly interpretation must connect only its own god and relation evidence");
      assert(fragment.mechanism.includes(month.displayLabel));
      assert(fragment.mechanism.includes(month.stemTenGod), "Monthly interpretation lost its own stem's meaning");
      assert.equal(context.reportFacts.facts.find(item => item.id === godGround)?.value, month.stemTenGod);
      assert(fragment.expansion?.decisionRule, "A monthly interpretation needs a concrete selection principle");
      const fact = context.reportFacts.facts.find(item => item.id === ground)!;
      assert.equal(fact.value, kind);
      for (const target of targets) assert(fact.basis.includes(`${target.targetPillar} ${target.targetBranch} ${kind === "clash" ? "충" : "합"}`));
      assert(!fact.basis.includes(kind === "clash" ? " 합" : " 충"), "A monthly fact contains the opposite relation");
    }
  }
  if (expected.length) assert.deepEqual(relation.fragments.flatMap(fragment => fragment.grounds).sort(), expected.sort());
  assert.deepEqual(serialized.required_timing_terms, context.reportFacts.monthlyRelationMonths.map(month => month.displayLabel));
  for (const section of context.payload.sections.filter(section => section.id !== "relation")) {
    assert.deepEqual(section.required_timing_terms, []);
    assert.deepEqual(section.prohibited_terms, serialized.required_timing_terms);
  }
}

check("60 real charts cover every day master and keep distinct natal/year evidence in the renderer", () => {
  const dayMasters = new Set<string>();
  const annualGods = new Set<string>();
  for (let offset = 0; offset < 60; offset += 1) {
    const birthDate = new Date(Date.UTC(1995, 4, 20 + offset)).toISOString().slice(0, 10);
    const calculated = adapter.calculate({ birthDate, birthTime: "20:20", gender: offset % 2 ? "male" : "female", calendar: "solar" });
    const context = buildReportRenderPayload(calculated, "genz");
    const { reportFacts, payload, selected } = context;
    dayMasters.add(reportFacts.dayMaster);
    annualGods.add(reportFacts.annualTenGod);
    const essence = selected.sections.find(section => section.id === "essence")!;
    assert(essence.fragments.some(fragment => fragment.grounds.includes("day-master")));
    assert(essence.fragments.some(fragment => fragment.grounds.includes("annual-ten-god")));
    for (const [sectionId, natalGround, god] of [
      ["yearly", "natal-month-main-ten-god", reportFacts.natalMonthMainTenGod],
      ["career", "da-yun-ten-god", reportFacts.daYunTenGod],
      ["mental", "natal-month-ten-god", reportFacts.natalMonthTenGod],
    ] as const) {
      const section = selected.sections.find(item => item.id === sectionId)!;
      const combined = section.fragments.find(fragment => fragment.grounds.includes(natalGround) && fragment.grounds.includes("annual-ten-god"));
      assert(combined, `${birthDate}/${sectionId}: personalized pair was crowded out`);
      assert(combined.mechanism.includes(god), `${sectionId}: background ten god missing`);
      assert(combined.mechanism.includes(reportFacts.annualTenGod), `${sectionId}: annual ten god missing`);
    }
    assert.equal(payload.structural_context.natal_month_stem_ten_god, reportFacts.natalMonthTenGod);
    assert.equal(payload.structural_context.natal_month_main_ten_god, reportFacts.natalMonthMainTenGod);
    const requiredGods = [...new Set([reportFacts.natalMonthTenGod, reportFacts.natalMonthMainTenGod, reportFacts.annualTenGod, reportFacts.daYunTenGod, ...reportFacts.monthlyRelationMonths.map(month => month.stemTenGod)])];
    const actualGods = new Set([...requiredGods, ...reportFacts.natalTenGodEvidence.map(item => item.tenGod)]);
    const godDefinitions = payload.terminology.filter(term => term.term in TEN_GOD_MEANINGS);
    assert.equal(new Set(godDefinitions.map(term => term.term)).size, godDefinitions.length, "Duplicated ten gods entered the reader glossary");
    for (const god of requiredGods) assert(godDefinitions.some(term => term.term === god), `A selected god lacks a reader-facing explanation: ${god}`);
    for (const { term } of godDefinitions) assert(actualGods.has(term), `Uncalculated ten god entered the glossary: ${term}`);
    for (const { term, meaning } of godDefinitions) {
      assert(meaning, `${term}: no reader-facing explanation`);
      assert(!/기능|자원|기준|조율|관점|범위|여지|올해|세운|대운/u.test(meaning), `${term}: internal jargon or timing leaked into the plain-language definition`);
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
  const annual = context.selected.sections.find(section => section.id === "yearly")!.fragments;
  for (const kind of ["clash", "combination"]) {
    assert(annual.some(fragment => fragment.grounds.includes(`annual-branch-${kind}`)));
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
  assert.deepEqual(context.payload.yearly_context.timing[0].relations.map(item => [item.targetPillar, item.relation]), [
    ["year", "clash"], ["month", "combination"], ["day", "combination"], ["hour", "overlap"],
  ]);
  assert.deepEqual(context.selected.sections.find(section => section.id === "relation")!.fragments.map(fragment => fragment.id).sort(), ["F-TIMING-1-clash", "F-TIMING-1-combination"]);
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
  assert.deepEqual(after.selected, before.selected);
  assert.deepEqual(after.payload.structural_context, before.payload.structural_context);
  assert.deepEqual(after.payload.sections, before.payload.sections);
  assert.deepEqual(after.payload.facts, before.payload.facts);
  checkGrounds(after);
});

check("detail does not reintroduce authored scenes or change 7–9 emoticons and messenger length", () => {
  const { payload } = buildReportRenderPayload(chart, "genz");
  assert.equal(REPORT_EMOTICON_RANGE, "7~9");
  assert.equal(MAX_REPORT_EMOTICONS, 9);
  assert(payload.style.speech.includes("전체 7~9개"));
  assert(payload.constraints.includes(REPORT_EMOTICON_INSTRUCTIONS));
  assert(getReportPrompt("genz").instructions.includes(REPORT_EMOTICON_INSTRUCTIONS));
  assert.deepEqual(payload.sections.map(section => section.paragraph_length.target), [230, 330, 330, 330, 330, 230]);
  assert(payload.sections.find(section => section.id === "summary")!.fragments.length === 0);
  for (const section of payload.sections) for (const fragment of section.fragments) {
    assert(!Object.hasOwn(fragment, "concreteScene"));
    assert(!Object.hasOwn(fragment, "concrete_scene"));
    if (fragment.expansion) {
      assert.deepEqual(Object.keys(fragment.expansion).filter(key => key !== "repetition_guard").sort(), ["decision_rule", "mechanism_steps"]);
    }
  }
  assert.equal(JSON.stringify(chart), originalChart, "Rendering mutated the stored chart");
});

console.log(`Report detail integration: ${checks} groups passed (60 real charts, 48 exact timing boundaries; no network/database calls).`);
