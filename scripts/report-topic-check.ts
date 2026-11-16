import { checkObservationContract } from "./testing/report-observations";
import assert from "node:assert/strict";
import { KoreanPolicyAdapter } from "../src/lib/saju/korean-policy-adapter";
import { buildReportRenderPayload } from "../src/lib/saju/report-payload";
import { buildFinancialReading, buildRelationshipEvidence } from "../src/lib/saju/report-topic-corpus";
import { extractReportFacts } from "../src/lib/saju/report-facts";
import { buildFortuneReadings } from "../src/lib/saju/report-fortune-reading";
import { countAdviceSentences, getAdviceDensityIssues, getClosingTimelineIssues, hasNearDuplicateExplanation, getTopicCoverageIssues } from "../src/lib/llm/report-topic-rules";
import { hasInlineTermExplanation } from "../src/lib/llm/report-rules";
import { TEN_GOD_MEANINGS } from "../src/lib/saju/report-detail-corpus";

const chart = new KoreanPolicyAdapter().calculate({ birthDate: "1995-05-20", birthTime: "20:20", gender: "female", calendar: "solar" });
const original = JSON.stringify(chart);
const facts = extractReportFacts(chart);
let checks = 0;
function check(name: string, run: () => void) { run(); checks++; console.log(`PASS ${name}`); }
const reading = (date: string) => buildReportRenderPayload(chart, "genz", new Date(date));

check("late October prioritizes the current and remaining calendar-year periods", () => {
  const result = reading("2026-10-29T12:00:00+09:00");
  assert.deepEqual(result.reportFacts.monthlyRelationMonths.map(month => month.calendarMonth), [10, 11, 12]);
  assert.deepEqual(result.payload.yearly_context.timing.map(month => month.phase), ["current", "future", "future"]);
  assert.deepEqual(result, reading(result.payload.as_of.instant));
  assert.equal(JSON.stringify(chart), original, "Rendering mutated a stored birth calculation");
});

check("all daily reading dates exclude expired periods while any remain", () => {
  for (let day = 0; day < 370; day++) {
    const date = new Date(Date.UTC(2026, 0, 31 + day));
    const { reportFacts, payload } = buildReportRenderPayload(chart, "genz", date);
    const remaining = reportFacts.monthlyCalendar.filter(month => Date.parse(month.endAt) > date.getTime());
    if (remaining.length) {
      assert(payload.yearly_context.timing.every(month => month.phase !== "past"));
      assert.equal(payload.yearly_context.timing.length, Math.min(3, remaining.length));
      const current = remaining.find(month => Date.parse(month.startAt) <= date.getTime());
      if (current) assert(payload.yearly_context.timing.some(month => month.start_at === current.startAt));
    } else assert(payload.yearly_context.timing.every(month => month.phase === "past"));
  }
});

check("January keeps one correctly labelled remaining period; after the year reads retrospectively", () => {
  const january = reading("2027-01-20T00:00:00+09:00");
  assert.equal(january.payload.yearly_context.timing.length, 1);
  assert.equal(january.payload.yearly_context.timing[0].month, "2027년 1월 5일~2월 4일");
  assert(reading("2027-03-01T00:00:00+09:00").payload.yearly_context.timing.every(month => month.phase === "past"));
  assert.throws(() => buildReportRenderPayload(chart, "genz", new Date("invalid")));
});

check("current months without a combination or clash use only their calculated god", () => {
  const context = reading("2026-10-29T00:00:00+09:00");
  checkObservationContract(context);
  const plain = context.reportFacts.monthlyRelationMonths.filter(month => !month.relations.some(relation => relation.relation !== "overlap"));
  assert(plain.length > 0);
  for (const month of plain) {
    assert(context.payload.observations.some(item => item.id === `monthly-${month.ordinal}`));
    assert.equal(context.payload.yearly_context.timing.find(item => item.month === month.displayLabel)!.stem_ten_god, month.stemTenGod);
  }
});

check("100 cycle/annual pairs change money choices without inventing a financial god", () => {
  const gods = Object.keys(TEN_GOD_MEANINGS);
  for (const annual of gods) {
    const decisions = gods.map(cycle => buildFinancialReading({ ...facts, annualTenGod: annual, daYunTenGod: cycle }));
    assert.equal(new Set(decisions.map(item => item.question)).size, 10);
    assert.equal(new Set(decisions.map(item => item.decision)).size, 10);
  }
  const base = buildFinancialReading(facts);
  assert(base.decision.includes("수정·추가 작업"));
  assert(base.decision.includes("책임이 늘어나는 경우"));
  assert.notEqual(base.decision, buildFinancialReading({ ...facts, daYunTenGod: "편재" }).decision);
});

check("close relationship uses the actual day hidden main god, without birth-hour inference", () => {
  assert.equal(facts.natalDayMainTenGod, "상관");
  const relation = buildRelationshipEvidence(facts, "test");
  assert.deepEqual(relation.grounds, ["natal-day-main-ten-god"]);
  assert.equal(facts.facts.find(fact => fact.id === relation.grounds[0])?.value, "상관");
  const unknown = structuredClone(chart);
  unknown.input.birthTimeKnown = false;
  assert.deepEqual(buildRelationshipEvidence(extractReportFacts(unknown), "test"), relation);
  assert.equal(new Set(Object.keys(TEN_GOD_MEANINGS).map(natalDayMainTenGod => buildRelationshipEvidence({ ...facts, natalDayMainTenGod }, "test").translation)).size, 10);
});

check("topic coverage flags missing money, without imposing a fixed example", () => {
  assert.deepEqual(getTopicCoverageIssues("career", "배운 자료를 다음 일에 쓰는 방식이 두드러져."), []);
  assert(getTopicCoverageIssues("career", "가까운 사람과 마음을 주고받는 방식이 달라져.").length);
  assert.deepEqual(getTopicCoverageIssues("career", "받을 대가가 같아도 수정 요청과 비용이 늘면 실제로 남는 돈이 달라져."), []);
  assert.deepEqual(getTopicCoverageIssues("career", "새 방법을 배우는 비용과 기대하는 수입을 따로 생각하면 돼."), []);
  assert.deepEqual(getTopicCoverageIssues("mental", "돈이 아니라 내 마음을 쉬는 방법을 설명해."), []);
});

check("near-duplicate explanations trigger a style signal; shared terminology alone does not", () => {
  const previous = "맡은 일을 꾸준히 해내고 작은 약속을 하나씩 지키면서 주변 사람들에게 믿을 수 있는 결과를 남기는 게 좋아.";
  assert(hasNearDuplicateExplanation(previous, previous.replace("주변 사람들에게", "함께한 사람들에게")));
  assert(!hasNearDuplicateExplanation(previous, "정관은 맡은 역할을 말해. 대가와 비용을 나누고 수정 요청이 늘면 새 작업의 값을 함께 정하면 돼."));
});

check("closing keeps an unfinished year in the present and does not invent achievements", () => {
  assert(getClosingTimelineIssues("2026년은 새로운 역할로 이어 가는 해였어.", false).length);
  assert.deepEqual(getClosingTimelineIssues("2026년은 새로운 역할로 이어 가는 해였어.", true), []);
  assert(getClosingTimelineIssues("그만큼 해낸 일도 차곡차곡 쌓였어.", true).length);
  assert.deepEqual(getClosingTimelineIssues("잘 살피는 네 성향을 응원해. 남은 시간에도 편히 쉴 틈이 함께하길 바라.", false), []);
});

check("fortune interpretation follows actual evidence and keeps natal/annual/decade scopes", () => {
  const context = reading("2026-10-29T00:00:00+09:00");
  checkObservationContract(context);
  const readings = buildFortuneReadings(context.reportFacts);
  assert.deepEqual(readings.yearly.basis.map(item => item.scope), ["natal", "annual"]);
  assert.deepEqual(readings.career.basis.map(item => item.scope), ["decade", "annual"]);
  assert(readings.yearly.interplay.includes("원래 주제가 올해에도 반복"));
  assert(readings.career.interplay.includes("돈과 시간을 다루는 바탕"));
  assert(readings.mental.interplay.includes("내 판단"));
  assert(readings.relation.theme.includes("바라는 변화"));
  assert.equal([readings.yearly, readings.career, readings.relation].flatMap(item => item.periods ?? []).length, 3);
  assert.equal(readings.relation.periods?.length, 1);
  const october = readings.yearly.periods![0];
  assert.equal(october.relation_meanings.length, 0, "Missing relations must not be invented");
  assert(october.meaning.includes("배움"));
});

check("all 100 pairs vary descriptive meanings; invalid gods fail closed", () => {
  const gods = Object.keys(TEN_GOD_MEANINGS);
  for (const annualTenGod of gods) {
    const all = gods.map(god => buildFortuneReadings({ ...facts, annualTenGod, natalMonthMainTenGod: god, daYunTenGod: god }));
    assert.equal(new Set(all.map(item => JSON.stringify(item.yearly))).size, 10);
    assert.equal(new Set(all.map(item => item.career.theme)).size, 10);
    assert.equal(new Set(all.map(item => item.yearly.interplay)).size, 5);
  }
  assert.throws(() => buildFortuneReadings({ ...facts, annualTenGod: "미계산" }));
  assert.throws(() => buildFortuneReadings({ ...facts, daYunTenGod: "constructor" }));
});

check("repeated advice is an editorial signal, not a count of conditional fortune explanations", () => {
  const old = "지금은 상대의 이야기를 들으며 필요한 설명을 살펴봐. 다음에는 다른 질문이나 방법을 찾아봐. 함께 준비할 때 각자의 몫을 따져봐.";
  assert.equal(countAdviceSentences(old), 3);
  assert(getAdviceDensityIssues("relation", old).length);
  assert(getAdviceDensityIssues("career", "대가를 구별하는 게 중요해. 비용을 확인하는 게 좋아.").length);
  const fortune = "맡은 역할에 대한 신뢰와 책임이 함께 드러나. 약속이 분명하면 그만큼 서로 기대하는 것도 또렷해져. 대가가 같아도 드는 비용에 따라 남는 돈은 달라져.";
  assert.equal(countAdviceSentences(fortune), 0);
  assert.deepEqual(getAdviceDensityIssues("yearly", fortune + " 추가 비용만 한 번 확인해."), []);
  assert.deepEqual(getAdviceDensityIssues("summary", old), []);
});

check("ordinary syllables do not hide the first parenthesized technical explanation", () => {
  assert(hasInlineTermExplanation("같은 말을 다르게 이해하는 거리감도 있어. 서로 기대하는 부분이 어긋나는 관계(해)를 읽어.", "해"));
  assert(hasInlineTermExplanation("합리적인 생각만으로 정하지 않아. 서로 다른 요소가 연결되는 관계(합)를 읽어.", "합"));
  assert(hasInlineTermExplanation("충분한 설명이 있어. 기존 방식과 새 요구가 부딪히는 관계(충)를 읽어.", "충"));
  assert(!hasInlineTermExplanation("서로 기대하는 것이 달라. 해(맞지 않는 기대)를 읽어.", "해"));
  assert(!hasInlineTermExplanation("서로 기대하는 것이 달라. 그 힘(해)을 읽어.", "해"));
  const yearly = reading("2026-10-29T00:00:00Z").payload.sections.find(section => section.id === "yearly")!;
  assert.deepEqual(yearly.required_factual_terms, ["정관"], "A year name cannot substitute for annual ten-god evidence");
});

console.log(`Report topics: ${checks} groups passed (370 reading dates, 100 money pairs; no network/database).`);
