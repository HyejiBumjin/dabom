import assert from "node:assert/strict";
import { KoreanPolicyAdapter } from "../src/lib/saju/korean-policy-adapter";
import { extractReportFacts, type ReportFacts } from "../src/lib/saju/report-facts";
import { buildReportRenderPayload } from "../src/lib/saju/report-payload";
import { buildPersonalizedReportEvidence } from "../src/lib/saju/report-personalization-corpus";
import { TEN_GOD_MEANINGS } from "../src/lib/saju/report-detail-corpus";
import { CORPUS_VERSION } from "../src/lib/saju/interpretation-corpus";

// Pure evidence-selection regression checks. No database or model access.
const chart = new KoreanPolicyAdapter().calculate({ birthDate: "1995-05-20", birthTime: "20:20", gender: "female", calendar: "solar" });
const facts = extractReportFacts(chart);
const gods = Object.keys(TEN_GOD_MEANINGS);
let checks = 0;
function check(name: string, run: () => void) {
  run();
  checks += 1;
  console.log(`PASS ${name}`);
}

function evidence(value: ReportFacts) {
  return buildPersonalizedReportEvidence(value, CORPUS_VERSION);
}

function semantics(fragment: ReturnType<typeof evidence>["yearly"][number]) {
  // Ignore IDs and raw names: the test requires the actual selection principle
  // to change when the relevant underlying relationship changes.
  return fragment.expansion?.decisionRule ?? fragment.translation;
}

check("visible and hidden natal gods keep their individual calculated locations", () => {
  const peer = facts.natalTenGodEvidence.find(item => item.tenGod === "비견")!;
  assert(peer, "Calculated natal peer evidence missing");
  assert.deepEqual(peer.visibleAt, ["month"], "Day master must not count itself as an extra visible peer");
  assert(peer.hiddenAt.some(item => item.pillar === "hour" && item.stem === "辛"));
  const authority = facts.natalTenGodEvidence.find(item => item.tenGod === "정관")!;
  assert.deepEqual(authority.visibleAt, []);
  assert(authority.hiddenAt.some(item => item.pillar === "month" && item.stem === "丙" && item.role === "main"));
  const output = facts.natalTenGodEvidence.find(item => item.tenGod === "상관")!;
  assert.deepEqual(output.hiddenAt.filter(item => item.stem === "壬").map(item => item.pillar).sort(), ["day", "year"]);
  for (const item of facts.natalTenGodEvidence) {
    assert(item.visibleAt.length + item.hiddenAt.length > 0, "An absent god received a presence fact");
    assert.equal(new Set(item.visibleAt).size, item.visibleAt.length);
    const ground = facts.facts.find(fact => fact.id === `natal-god-${item.tenGod}`);
    assert.equal(ground?.value, item.tenGod);
    assert(ground?.timeScope.startsWith("태어난 명식"));
  }
});

check("every ten-god pair has approved evidence with honest natal/year/cycle scopes", () => {
  for (const background of gods) for (const annual of gods) {
    // Synthetic fact pairs exercise every rule; calculation accuracy is covered
    // separately by the real-chart extraction and existing fixture suites.
    const altered = { ...facts, natalMonthMainTenGod: background, natalMonthTenGod: background, daYunTenGod: background, annualTenGod: annual };
    const selected = evidence(altered);
    for (const [section, sourceGround] of [["yearly", "natal-month-main-ten-god"], ["career", "da-yun-ten-god"], ["mental", "natal-month-ten-god"]] as const) {
      assert.equal(selected[section].length, 1, `${section}/${background}/${annual}: unbounded evidence accumulation`);
      const fragment = selected[section][0];
      assert.equal(fragment.status, "approved");
      assert(fragment.grounds.includes(sourceGround) && fragment.grounds.includes("annual-ten-god"));
      assert(fragment.grounds.every(ground => ground === sourceGround || ground === "annual-ten-god" || (section === "career" && ground.startsWith("natal-god-") && altered.facts.some(fact => fact.id === ground))), `${section}: unsupported extra ground`);
      assert(fragment.mechanism.includes(background) && fragment.mechanism.includes(annual));
      assert(fragment.expansion?.decisionRule, `${section}: no useful choice explained`);
      assert(fragment.expansion?.repetitionGuard, `${section}: no distinct section boundary`);
      assert.equal(fragment.concreteScene, "", "Authored sample prose must not become evidence");
      assert.deepEqual(fragment.expansion?.sceneVariants, []);
      const meta = selected.sectionMetadata[section];
      assert(meta.question && meta.distinctFocus && meta.avoidRepeating.length);
      assert(meta.primaryTerms.every(term => gods.includes(term)), `${section}: unsupported required terminology`);
    }
    assert.equal(new Set([selected.sectionMetadata.yearly.question, selected.sectionMetadata.career.question, selected.sectionMetadata.mental.question]).size, 3, "Different sections ask the same question");
  }
});

check("same annual god receives different real decisions from distinct natal and cycle backgrounds", () => {
  for (const annualTenGod of gods) {
    const variants = gods.map(background => evidence({ ...facts, annualTenGod, natalMonthMainTenGod: background, natalMonthTenGod: background, daYunTenGod: background }));
    for (const section of ["yearly", "career", "mental"] as const) {
      const decisions = new Set(variants.map(item => semantics(item[section][0])));
      assert(decisions.size >= 5, `${annualTenGod}/${section}: different backgrounds still collapse to one generic decision`);
    }
  }
  const before = evidence(facts);
  const changedCareer = evidence({ ...facts, daYunTenGod: facts.daYunTenGod === "식신" ? "상관" : "식신" });
  assert.notEqual(semantics(before.career[0]), semantics(changedCareer.career[0]));
  assert.deepEqual(before.yearly, changedCareer.yearly, "A cycle change contaminated natal/year evidence");
  assert.deepEqual(before.mental, changedCareer.mental, "A cycle change contaminated the personal pace evidence");
});

check("each live section receives a different question and traceable approved fragment IDs", () => {
  const context = buildReportRenderPayload(chart, "genz");
  const grounds = new Set(context.reportFacts.facts.map(item => item.id));
  assert.equal(new Set(context.payload.sections.map(section => section.reading_question)).size, 6);
  for (const section of context.payload.sections) {
    assert(section.reading_question && section.distinct_focus);
    assert(section.avoid_repeating.length > 0);
    const source = context.selected.sections.find(item => item.id === section.id)!;
    assert.deepEqual(section.fragments.map(fragment => fragment.id), source.fragments.map(fragment => fragment.id));
    for (const fragment of section.fragments) {
      assert(fragment.grounds.every(ground => grounds.has(ground)), `${fragment.id}: an invented grounding fact entered the renderer`);
      if (source.fragments.find(item => item.id === fragment.id)?.expansion) {
        assert(fragment.expansion?.repetition_guard, `${fragment.id}: renderer lost its repetition boundary`);
      }
    }
  }
  for (const sectionId of ["yearly", "career", "mental"]) {
    const section = context.selected.sections.find(item => item.id === sectionId)!;
    assert(!section.fragments.some(fragment => /^F-ANNUAL-(?!NATAL-)|^F-INTERACTION-|^F-MENTAL-DEFAULT|^F-NATAL-MONTH-MAIN-ANNUAL-/u.test(fragment.id)), `${sectionId}: generic duplicate evidence survived personalized selection`);
  }
});

check("an unavailable natal support cannot be promoted into a personalized career claim", () => {
  const withoutSupport: ReportFacts = {
    ...facts,
    natalTenGodEvidence: [],
    facts: facts.facts.filter(item => !item.id.startsWith("natal-god-")),
  };
  const selected = evidence(withoutSupport);
  assert(selected.career.every(fragment => !fragment.grounds.some(ground => ground.startsWith("natal-god-"))), "Career explanation cites unavailable natal support");
  const actual = evidence(facts);
  const available = new Set(facts.natalTenGodEvidence.map(item => `natal-god-${item.tenGod}`));
  for (const fragment of actual.career) {
    for (const ground of fragment.grounds.filter(item => item.startsWith("natal-god-"))) assert(available.has(ground));
  }
});

check("actual visible natal support changes the work reading and disappears when its evidence is removed", () => {
  const actual = evidence(facts);
  assert(actual.career[0].grounds.includes("natal-god-정인"), "Known visible hour support was not selected");
  assert(actual.career[0].mechanism.includes("정인"));
  const noVisibleSupport = structuredClone(facts);
  const resource = noVisibleSupport.natalTenGodEvidence.find(item => item.tenGod === "정인")!;
  resource.visibleAt = [];
  assert(resource.hiddenAt.length > 0, "Fixture must distinguish hidden presence from visible support");
  const noGround = { ...facts, facts: facts.facts.filter(item => item.id !== "natal-god-정인") };
  for (const unavailable of [noVisibleSupport, noGround]) {
    const without = evidence(unavailable);
    assert(!without.career[0].grounds.includes("natal-god-정인"));
    assert(!without.career[0].mechanism.includes("정인"), "Removed support remains in the interpretation");
    assert.notEqual(semantics(without.career[0]), semantics(actual.career[0]), "Only the evidence label changed; the work decision stayed the same");
    assert.notEqual(without.sectionMetadata.career.question, actual.sectionMetadata.career.question);
    assert.notEqual(without.sectionMetadata.career.distinctFocus, actual.sectionMetadata.career.distinctFocus);
    assert.deepEqual(without.yearly, actual.yearly, "Removing work support rewrote an unrelated section");
    assert.deepEqual(without.mental, actual.mental, "Removing work support rewrote an unrelated section");
  }
  const unknownHour = structuredClone(chart);
  unknownHour.input.birthTimeKnown = false;
  const unknown = evidence(extractReportFacts(unknownHour));
  assert(!unknown.career[0].grounds.includes("natal-god-정인"), "Unknown hour still activates visible hour support");
  assert.notEqual(unknown.sectionMetadata.career.question, actual.sectionMetadata.career.question);
});

check("opposite-polarity gods in the same family retain their own direction", () => {
  for (const [left, right] of [["비견", "겁재"], ["식신", "상관"], ["편재", "정재"], ["편관", "정관"], ["편인", "정인"]]) {
    const forward = evidence({ ...facts, natalMonthMainTenGod: left, annualTenGod: right });
    const reverse = evidence({ ...facts, natalMonthMainTenGod: right, annualTenGod: left });
    assert.notEqual(semantics(forward.yearly[0]), semantics(reverse.yearly[0]), `${left}/${right}: direction disappeared into a shared family template`);
    assert.notEqual(forward.sectionMetadata.yearly.distinctFocus, reverse.sectionMetadata.yearly.distinctFocus);
  }
});

check("monthly relationship explanations use their own god and remain distinct even for the same relation", () => {
  const context = buildReportRenderPayload(chart, "genz");
  const relation = context.selected.sections.find(section => section.id === "relation")!;
  const combinations = relation.fragments.filter(fragment => fragment.id.endsWith("-combination"));
  assert(combinations.length >= 2, "Fixture must exercise two combination months");
  assert(new Set(combinations.map(semantics)).size > 1, "Different combination months repeat the same generic advice");
  for (const month of context.reportFacts.monthlyRelationMonths) {
    const matches = relation.fragments.filter(fragment => fragment.id.startsWith(`F-TIMING-${month.ordinal}-`));
    assert(matches.length);
    for (const fragment of matches) {
      assert(fragment.grounds.includes(`monthly-${month.ordinal}-ten-god`));
      assert(fragment.mechanism.includes(month.stemTenGod));
    }
  }
  const reordered = structuredClone(chart);
  reordered.fortune.monthly.reverse();
  assert.deepEqual(extractReportFacts(reordered), facts, "Stored array ordering changed personalized month selection");
});

check("unknown birth hour never contributes a natal presence or personalized reading", () => {
  const unknown = structuredClone(chart);
  unknown.input.birthTimeKnown = false;
  const before = buildReportRenderPayload(unknown);
  unknown.pillars.hour = { ganZhi: "壬子", heavenlyStem: "壬", earthlyBranch: "子", hiddenStems: ["癸"], stemTenGod: "伤官", hiddenTenGods: ["食神"], elementPair: "水水" };
  const after = buildReportRenderPayload(unknown);
  assert.deepEqual(after.reportFacts, before.reportFacts);
  assert.deepEqual(after.payload.sections, before.payload.sections);
  for (const item of after.reportFacts.natalTenGodEvidence) {
    assert(!item.visibleAt.includes("hour"));
    assert(!item.hiddenAt.some(location => location.pillar === "hour"));
  }
  assert(!JSON.stringify(after.payload).includes(chart.input.localDateTime), "Raw birth data entered model input");
});

console.log(`Report personalization: ${checks} groups passed (100 god-pair scenarios; no network/database calls).`);
