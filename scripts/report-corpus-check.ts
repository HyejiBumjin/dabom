import assert from "node:assert/strict";
import { INTERPRETATION_CORPUS, selectCorpus } from "../src/lib/saju/interpretation-corpus";
import { TEN_GOD_MEANINGS } from "../src/lib/saju/report-detail-corpus";
import { extractReportFacts } from "../src/lib/saju/report-facts";
import { buildReportTerminology } from "../src/lib/saju/report-terminology";
import { KoreanPolicyAdapter } from "../src/lib/saju/korean-policy-adapter";

// Pure calculation and corpus selection only: no model, account or persistence.
const facts = extractReportFacts(new KoreanPolicyAdapter().calculate({ birthDate: "1995-05-20", birthTime: "20:20", gender: "female", calendar: "solar" }));
const gods = Object.keys(TEN_GOD_MEANINGS);
const plainGodMeanings = new Map<string, string>();
let checks = 0;

const actualEvidence = new Set(facts.facts.map(fact => fact.id));
const actualDetails = selectCorpus(facts).sections.flatMap(section => section.fragments).filter(fragment => /^F-NATAL-MONTH-|^F-ANNUAL-NATAL-/u.test(fragment.id));
assert(actualDetails.length >= 2, "Calculated month evidence did not reach the corpus");
assert(actualDetails.every(fragment => fragment.grounds.every(ground => actualEvidence.has(ground))), "A selected detail has no calculated ground");
checks++;

for (const natal of gods) {
  for (const annual of gods) {
    const context = { ...facts, natalMonthTenGod: natal, natalMonthMainTenGod: natal, annualTenGod: annual };
    const selected = selectCorpus(context);
    const opening = selected.sections.find(section => section.id === "essence")!.fragments.filter(fragment => fragment.grounds.includes("natal-month-ten-god"));
    const work = selected.sections.find(section => section.id === "career")!.fragments.filter(fragment => fragment.grounds.includes("natal-month-main-ten-god"));
    assert.equal(opening.length, 1, `${natal}: missing or duplicated natal evidence`);
    assert(opening[0].mechanism.includes(`월간의 ${natal}`));
    assert.equal(work.length, 1, `${natal}/${annual}: missing or duplicated natal/annual evidence`);
    assert(work[0].mechanism.includes(`본기의 ${natal}`));
    assert(work[0].mechanism.includes(`천간의 ${annual}`), "Annual and natal labels were substituted");
    assert.deepEqual(work[0].grounds, ["natal-month-main-ten-god", "annual-ten-god"]);
    assert.equal(work[0].concreteScene, "", "Authored example prose should not become report input");
    assert.deepEqual(work[0].expansion?.sceneVariants, []);
    assert(work[0].expansion?.decisionRule, "Two functions lack an application principle");
    const definitions = buildReportTerminology(context);
    assert.deepEqual(definitions.filter(term => gods.includes(term.term)).map(term => term.term).sort(), [...new Set([natal, annual, context.daYunTenGod])].sort(), "Unrelated or duplicated ten gods entered the glossary");
    for (const god of new Set([natal, annual, context.daYunTenGod])) {
      const meaning = definitions.find(term => term.term === god)?.meaning;
      assert(meaning, `${god}: the reader has no plain-language meaning`);
      assert(!/기능|자원|기준|조율|관점|범위|여지|올해|세운|대운/u.test(meaning), `${god}: internal jargon or timing leaked into the plain-language definition`);
      plainGodMeanings.set(god, meaning);
    }
    checks++;
  }
}
assert.equal(plainGodMeanings.size, 10, "Not all ten gods have a reader-facing definition");
assert.equal(new Set(plainGodMeanings.values()).size, 10, "Different ten gods were collapsed into the same vague definition");
checks++;

for (const [hasAnnualClash, hasAnnualCombination] of [[false, false], [true, false], [false, true], [true, true]]) {
  const selected = selectCorpus({ ...facts, hasAnnualClash, hasAnnualCombination });
  const yearly = selected.sections.find(section => section.id === "yearly")!.fragments;
  assert.equal(yearly.some(fragment => fragment.grounds.includes("annual-branch-clash")), hasAnnualClash);
  assert.equal(yearly.some(fragment => fragment.grounds.includes("annual-branch-combination")), hasAnnualCombination);
  checks++;
}

for (const annualTenGod of ["정관", "편관"]) {
  for (const daYunTenGod of ["정재", "편재"]) {
    const selected = selectCorpus({ ...facts, annualTenGod, daYunTenGod, annualDaYunTheme: "role-and-results" as const });
    const combined = selected.sections.flatMap(section => section.fragments).find(fragment => fragment.id === "F-YEARLY-ROLE-RESULTS")!;
    assert(combined);
    assert(!/정관|편관|정재|편재/u.test(combined.mechanism), "A shared combination asserts one subtype");
    assert(combined.mechanism.includes("관성") && combined.mechanism.includes("재성"));
    checks++;
  }
}

for (const term of ["합", "충"]) {
  const fragment = INTERPRETATION_CORPUS.find(item => item.id === `F-MONTHLY-${term}`)!;
  const interpretation = [fragment.mechanism, fragment.translation, ...(fragment.expansion?.mechanismSteps ?? [])].join(" ");
  assert(!/매너리즘|우유부단|감정 반응이 먼저|서운함|관계 파괴|짜증/u.test(interpretation));
  assert(!/올해|세운/u.test(interpretation), "Annual timing leaked into the reusable monthly meaning");
  assert.equal(fragment.concreteScene, "");
  checks++;
}

const unknown = selectCorpus({ ...facts, natalMonthTenGod: "미확인", natalMonthMainTenGod: "미확인" });
assert(!unknown.sections.flatMap(section => section.fragments).some(fragment => fragment.grounds.some(ground => ground === "natal-month-ten-god" || ground === "natal-month-main-ten-god")), "Unknown natal evidence received a fabricated interpretation");
checks++;
console.log(`PASS: ${checks} deterministic corpus checks; natal/year scope, subtype safety, conditional branch evidence and time-neutral terminology.`);
