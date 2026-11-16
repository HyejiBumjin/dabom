import { checkObservationContract } from "./testing/report-observations";
import assert from "node:assert/strict";
import { KoreanPolicyAdapter } from "../src/lib/saju/korean-policy-adapter";
import { extractReportFacts } from "../src/lib/saju/report-facts";
import { buildReportRenderPayload } from "../src/lib/saju/report-payload";
import { lifeStage, elementLink, LIFE_STAGES } from "../src/lib/saju/myeongri-synthesis";
import { assignTopicTiming } from "../src/lib/saju/report-topic-timing";
import { getAdvancedReportIssues } from "../src/lib/llm/advanced-report-rules";
import { hasReportTerm, hasInlineTermExplanation } from "../src/lib/llm/report-rules";
import { splitReportTermAnnotations } from "../src/lib/report-term-annotations";

const adapter = new KoreanPolicyAdapter();
const chart = adapter.calculate({ birthDate: "1995-05-20", birthTime: "20:20", gender: "female", calendar: "solar" });
const asOf = new Date("2026-10-29T12:00:00+09:00");
let checks = 0;
function check(name: string, run: () => void) { run(); checks++; console.log(`PASS ${name}`); }

check("120 stem/branch stages match the independent conventional table, including yin reversal and earth", () => {
  // Columns 子丑寅卯辰巳午未申酉戌亥; fixtures deliberately do not call an offset builder.
  const rows: Record<string, string> = {
    甲: "목욕 관대 임관 제왕 쇠 병 사 묘 절 태 양 장생",
    乙: "병 쇠 제왕 임관 관대 목욕 장생 양 태 절 묘 사",
    丙: "태 양 장생 목욕 관대 임관 제왕 쇠 병 사 묘 절",
    丁: "절 묘 사 병 쇠 제왕 임관 관대 목욕 장생 양 태",
    戊: "태 양 장생 목욕 관대 임관 제왕 쇠 병 사 묘 절",
    己: "절 묘 사 병 쇠 제왕 임관 관대 목욕 장생 양 태",
    庚: "사 묘 절 태 양 장생 목욕 관대 임관 제왕 쇠 병",
    辛: "장생 양 태 절 묘 사 병 쇠 제왕 임관 관대 목욕",
    壬: "제왕 쇠 병 사 묘 절 태 양 장생 목욕 관대 임관",
    癸: "임관 관대 목욕 장생 양 태 절 묘 사 병 쇠 제왕",
  };
  for (const [stem, row] of Object.entries(rows)) {
    assert.deepEqual([..."子丑寅卯辰巳午未申酉戌亥"].map(branch => lifeStage(stem, branch)), row.split(" "));
  }
  assert.throws(() => lifeStage("invalid", "子"));
  assert.throws(() => lifeStage("constructor", "子"));
  assert.throws(() => lifeStage("甲", "invalid"));
});

check("sample has actual exposure, exact annual echo and correctly directed cycle/annual links", () => {
  const facts = extractReportFacts(chart);
  const s = facts.synthesis;
  assert.equal(s.natal.season.monthBranch, "巳");
  const exposed = s.natal.exposures.find(item => item.hiddenAt === "month")!;
  assert.equal(exposed.stem, "戊");
  assert.equal(exposed.tenGod, "정인");
  assert.equal(exposed.main, false);
  assert.deepEqual(exposed.visibleAt, ["hour"]);
  assert(!s.natal.exposures.some(item => item.visibleAt.includes("day")), "Reference day stem cannot count as exposure");
  assert.deepEqual(s.annualEcho.hiddenAt, ["month"]);
  assert.deepEqual(s.annualEcho.visibleAt, []);
  assert.equal(s.stemLinks[0].fromStem, "甲");
  assert.equal(s.stemLinks[0].toStem, "丙");
  assert.equal(s.stemLinks[0].relation, "produces");
  assert(s.stemLinks.find(item => item.to === "day")?.combination);
  assert.equal(s.stemLinks.find(item => item.to === "day")?.relation, "controls");
  assert.equal(s.lifeStages.find(item => item.scope === "annual")?.stage, "병");
  assert.equal(s.lifeStages.find(item => item.scope === "da-yun")?.stage, "제왕");
});

check("exposure is exact-stem while rooting is same-element; no polarity shortcut", () => {
  const changed = structuredClone(chart);
  changed.pillars.hour.heavenlyStem = "己";
  const s = extractReportFacts(changed).synthesis;
  assert(!s.natal.exposures.some(item => item.hiddenAt === "month" && item.stem === "戊"));
  assert(s.natal.visible.find(item => item.pillar === "hour")!.rootedAt.includes("month"));
  assert.equal(elementLink("wood", "fire"), "produces");
  assert.equal(elementLink("fire", "wood"), "produced-by");
  assert.equal(elementLink("metal", "wood"), "controls");
  assert.equal(elementLink("wood", "metal"), "controlled-by");
});

check("climate keeps warm/cold and dry/damp observations distinct from a favorable-element verdict", () => {
  for (const [branch, thermal, moisture, direction] of [
    ["巳", "warm", "unspecified", "reinforces"], ["未", "warm", "dry", "reinforces"],
    ["子", "cold", "unspecified", "counterbalances"], ["丑", "cold", "damp", "counterbalances"],
    ["辰", "transitional", "damp", "undetermined"], ["戌", "transitional", "dry", "undetermined"],
  ]) {
    const changed = structuredClone(chart); changed.pillars.month.earthlyBranch = branch;
    const c = extractReportFacts(changed).synthesis.climate;
    assert.equal(c.thermal, thermal); assert.equal(c.earthMoisture, moisture); assert.equal(c.seasonalDirection, direction);
    assert.equal(c.annualEffect, "warms"); assert(!("yongshin" in c));
  }
  const waterYear = structuredClone(chart);
  waterYear.fortune.yearly.find(item => item.year === waterYear.fortune.targetYear)!.ganZhi = "壬子";
  assert.equal(extractReportFacts(waterYear).synthesis.climate.seasonalDirection, "counterbalances");
});

check("unknown hour erases every new hour influence; stored chart remains unchanged", () => {
  const unknown = structuredClone(chart); unknown.input.birthTimeKnown = false;
  const before = buildReportRenderPayload(unknown, "genz", asOf);
  unknown.pillars.hour = { ...unknown.pillars.hour, heavenlyStem: "壬", earthlyBranch: "子", ganZhi: "壬子" };
  const after = buildReportRenderPayload(unknown, "genz", asOf);
  assert.deepEqual(before, after);
  assert(!after.reportFacts.synthesis.lifeStages.some(item => item.position === "hour"));
  const original = JSON.stringify(chart); buildReportRenderPayload(chart, "genz", asOf);
  assert.equal(JSON.stringify(chart), original);
});

check("same day master and year receive season-specific reasoning, without inventing strong/weak certainty", () => {
  const contexts = ["1995-05-20", "1995-07-19", "1995-09-17", "1995-11-16"].map(birthDate =>
    buildReportRenderPayload(adapter.calculate({ birthDate, birthTime: "20:20", gender: "female", calendar: "solar" }), "genz", asOf));
  assert.equal(new Set(contexts.map(item => item.reportFacts.dayMaster)).size, 1);
  const seasons = contexts.map(item => item.payload.observations.find(observation => observation.id === "natal-season")!.value);
  assert(new Set(seasons.map(item => JSON.stringify(item))).size >= 3);
  for (const context of contexts) checkObservationContract(context);
  assert.equal(contexts[0].reportFacts.advanced.strength.status, "undetermined");
  assert.equal(contexts[0].reportFacts.advanced.yongshin.status, "undetermined");
});

check("topic periods have one owner and all primary/auxiliary interpretations have traceable grounds", () => {
  const context = buildReportRenderPayload(chart, "genz", asOf);
  checkObservationContract(context);
  const assigned = context.payload.sections.flatMap(item => item.required_timing_terms);
  assert.equal(assigned.length, 3); assert.equal(new Set(assigned).size, 3);
  assert.deepEqual(context.payload.sections.map(item => item.required_timing_terms), [[], ["10월 8일~11월 7일"], ["11월 7일~12월 7일"], ["12월 7일~2027년 1월 5일"], [], []]);
  assert(!JSON.stringify(context.payload).includes("1995-05-20"));
  assert(!JSON.stringify(context.payload).includes("20:20"));
  const reordered = structuredClone(context.reportFacts); reordered.monthlyRelationMonths.reverse();
  assert.deepEqual(assignTopicTiming(reordered), assignTopicTiming(context.reportFacts));
});

check("late-year one/two periods are not repeated or padded with expired months", () => {
  for (const [date, count] of [["2026-12-20", 2], ["2027-01-20", 1]] as const) {
    const c = buildReportRenderPayload(chart, "genz", new Date(date));
    const terms = c.payload.sections.flatMap(item => item.required_timing_terms);
    assert.equal(terms.length, count); assert.equal(new Set(terms).size, count);
    assert(c.payload.yearly_context.timing.every(item => item.phase !== "past"));
  }
});

check("stage labels are muted without treating ordinary Korean as technical claims", () => {
  for (const stage of LIFE_STAGES) {
    const text = `안에서 살피고 다음 방식을 다듬는 단계(${stage})를 읽어.`;
    assert(hasReportTerm(text, stage)); assert(hasInlineTermExplanation(text, stage));
    assert(splitReportTermAnnotations(text).some(part => part.isTerm && part.text.includes(stage)));
    assert.deepEqual(getAdvancedReportIssues(text, [stage]), []);
    assert(getAdvancedReportIssues(text, []).length);
  }
  for (const word of ["병원", "사람", "절차", "양쪽", "형태", "관대한", "목욕을 해"]) {
    assert(LIFE_STAGES.every(stage => !hasReportTerm(word, stage)), word);
    assert.deepEqual(getAdvancedReportIssues(word, []), []);
  }
});

check("medical/event/transformation invention and internal labels remain blocking", () => {
  for (const text of ["안으로 모으는 단계(병)라 올해 아플 수 있어.", "십이운성 태라 임신이 예정되어 있어.", "제왕이니 무조건 신강이야.", "조후용신은 물이야.", "천간의 합화가 확정됐어.", "synthesis_context를 읽어."]) {
    assert(getAdvancedReportIssues(text, ["병", "태", "제왕", "신강", "조후", "용신"]).length, text);
  }
});

console.log(`Report synthesis: ${checks} groups passed, including 120 lifecycle cells; no model/database/network calls.`);
