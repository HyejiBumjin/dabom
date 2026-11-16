import assert from "node:assert/strict";
import { buildReadingPlan, hasReadingMaterial } from "../src/lib/saju/report-reading-plan";
import { buildReportRenderPayload, type ReportObservation } from "../src/lib/saju/report-payload";
import { KoreanPolicyAdapter } from "../src/lib/saju/korean-policy-adapter";
import { evidenceUseIssues, editorialPenalty, getSpecificityIssues, repairEvidenceExcerpts } from "../src/lib/llm/report-evidence-review";
import { getAdvancedReportIssues } from "../src/lib/llm/advanced-report-rules";
import { checkObservationContract } from "./testing/report-observations";

let checks = 0;
function check(name: string, run: () => void) { run(); checks++; console.log(`PASS ${name}`); }
const chart = new KoreanPolicyAdapter().calculate({ birthDate: "1995-05-20", birthTime: "20:20", gender: "female", calendar: "solar" });
const context = buildReportRenderPayload(chart, "genz", new Date("2026-10-31T00:00:00Z"));

check("empty repetitions and roots never become primary interpretive material", () => {
  const absent: ReportObservation[] = [
    { id: "annual-echo", scope: "annual", kind: "exact-stem-occurrences", value: { visibleAt: [], hiddenAt: [] }, terms: ["식신"] },
    { id: "natal-roots", scope: "natal", kind: "roots", value: { entries: [] }, terms: [] },
  ];
  assert(absent.every(item => !hasReadingMaterial(item)));
  const observations = context.payload.observations.map(item => absent.find(empty => empty.id === item.id) ?? item);
  for (const section of context.payload.sections) {
    const plan = buildReadingPlan(section, observations);
    assert(!plan.basis_ids.includes("annual-echo"));
    assert(!plan.basis_ids.includes("natal-roots"));
  }
});

check("actual yearly encounters change the selected focal point", () => {
  const section = context.payload.sections.find(item => item.id === "yearly")!;
  const before = buildReadingPlan(section, context.payload.observations);
  const clash: ReportObservation = { id: "synthetic-annual-clash", scope: "annual", kind: "branch-relation", value: { kind: "clash", members: [{ scope: "annual" }, { scope: "natal" }] }, terms: ["충"] };
  const after = buildReadingPlan({ ...section, primary_evidence_ids: [...section.primary_evidence_ids, clash.id] }, [...context.payload.observations, clash]);
  assert(after.basis_ids.includes(clash.id));
  assert.notDeepEqual(before.basis_ids, after.basis_ids);
});

check("element arrows preserve actor and recipient, including inverse relations", () => {
  for (const [relation, action, source, target] of [
    ["produces", "생", "annual", "day"], ["produced-by", "생", "day", "annual"],
    ["controls", "극", "annual", "day"], ["controlled-by", "극", "day", "annual"],
  ]) {
    const observation: ReportObservation = { id: "link", scope: "annual", kind: "stem-link", value: { from: "annual", to: "day", fromStem: "丙", toStem: "甲", relation, combination: false }, terms: [] };
    const plan = buildReadingPlan({ id: "career", primary_evidence_ids: ["link"], context_evidence_ids: [] }, [observation]);
    assert.deepEqual(plan.connections[0].facts, { relation, source, target, action, combination: false });
  }
  assert(getAdvancedReportIssues("식신이 일간을 생해 주는 방향이야.", []).length);
  assert.deepEqual(getAdvancedReportIssues("일간이 생하는 쪽을 식신으로 읽어.", []), []);
});

check("selected topics stay distinct and do not invent strong/weak or useful-god conclusions", () => {
  checkObservationContract(context);
  const body = context.payload.sections.slice(1, 5);
  const ids = body.flatMap(section => section.reading_plan.basis_ids);
  assert.equal(ids.length, new Set(ids).size);
  assert(body.every(section => section.reading_plan.basis_ids.length === 2));
  for (const observation of context.payload.observations) {
    if (observation.kind.endsWith("candidate")) assert.equal((observation.value as { status: string }).status, "candidate");
  }
});

check("factual citations must be topic-owned, nonempty and visible in the actual prose", () => {
  const section = context.payload.sections.find(item => item.id === "career")!;
  const paragraph = "여러 해 이어지는 흐름(대운)의 정재는 꾸준한 돈 관리의 배경이야. 이 바탕이 올해 맡는 역할(정관)과 이어져, 결과를 계속 제공할 때 받는 대가에 초점이 놓여.";
  const uses = [
    { evidence_id: "active-da-yun", excerpt: "여러 해 이어지는 흐름(대운)의 정재는 꾸준한 돈 관리의 배경이야" },
    { evidence_id: "annual-pillar", excerpt: "이 바탕이 올해 맡는 역할(정관)과 이어져" },
  ];
  assert.deepEqual(evidenceUseIssues(section, paragraph, uses, context.payload), []);
  assert(evidenceUseIssues(section, paragraph, [uses[0], uses[0]], context.payload).length);
  assert(evidenceUseIssues(section, paragraph, [uses[0], { ...uses[1], evidence_id: "natal-day-hidden" }], context.payload).length);
  assert(evidenceUseIssues(section, paragraph, [uses[0], { ...uses[1], evidence_id: "invented-evidence" }], context.payload).length);
  assert(evidenceUseIssues(section, paragraph, [uses[0], { ...uses[1], excerpt: "본문에 없는 다른 문장이야" }], context.payload).length);
  assert(evidenceUseIssues(section, paragraph, [uses[0], { ...uses[1], excerpt: "결과를 계속 제공할 때 받는 대가에 초점이 놓여" }], context.payload).length);
});

check("repeated vague possibilities receive repair while one conditional example remains valid", () => {
  assert(getSpecificityIssues("yearly", "표현이 활발해질 수 있어. 마음도 커질 수 있지. 계획을 손볼 수 있어.").length);
  assert(getSpecificityIssues("career", "새 가능성이 있어. 상황이 달라질 수도 있어. 좋은 방향이야.").length);
  assert.deepEqual(getSpecificityIssues("relation", "가까운 사이에서 약속의 구체성이 두드러져. 함께 계획하는 상황이라면 각자가 생각한 날짜와 실제 약속이 달라질 수 있어. 이 차이를 말로 드러내는 데 무게가 실려."), []);
  assert(editorialPenalty(getSpecificityIssues("yearly", "바뀔 수 있어. 달라질 수 있어. 생길 수 있어.")[0]) > editorialPenalty("문단 분량"));
});

check("internal review fields cannot leak into the rendered message", () => {
  for (const label of ["reading_plan", "basis_ids", "supporting_ids", "evidence_uses", "evidence_id", "excerpt", "interpretive_axes"]) assert(getAdvancedReportIssues(`${label}를 함께 읽어.`, []).length);
});

check("prefix-only opening repair preserves the supporting quotation without inventing prose", () => {
  const before = "올해에는 역할을 맡는 정관의 의미가 선명해져. 약속한 기준을 지키는 쪽이 중심이야.";
  const after = before.replace("올해에는 ", "");
  const uses = [{ evidence_id: "annual-pillar", excerpt: "올해에는 역할을 맡는 정관의 의미가 선명해져" }];
  assert.deepEqual(repairEvidenceExcerpts(before, after, uses), [{ evidence_id: "annual-pillar", excerpt: "역할을 맡는 정관의 의미가 선명해져" }]);
  assert.deepEqual(repairEvidenceExcerpts(before, "전혀 새로운 문장이야.", uses), uses);
});

console.log(`Report connections: ${checks} groups passed; no API or database calls.`);
