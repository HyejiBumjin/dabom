import { checkObservationContract } from "./testing/report-observations";
import assert from "node:assert/strict";
import fs from "node:fs";
import { KoreanPolicyAdapter } from "../src/lib/saju/korean-policy-adapter";
import { extractAdvancedMyeongri, findAdvancedRelations, type BranchPosition } from "../src/lib/saju/advanced-myeongri";
import { buildReportRenderPayload } from "../src/lib/saju/report-payload";
import { getAdvancedReportIssues } from "../src/lib/llm/advanced-report-rules";
import { hasReportTerm } from "../src/lib/llm/report-rules";
import { validateReport } from "../src/lib/llm/report-generator";
import { splitReportTermAnnotations } from "../src/lib/report-term-annotations";
import type { Myeongsik, PillarName } from "../src/lib/saju/myeongsik";
import { tenGod } from "../src/lib/saju/myeongri-rules";

// Pure synthetic/chart fixtures. No database, real user record, or model calls.
let checks = 0;
function check(name: string, run: () => void) { run(); checks++; console.log(`PASS ${name}`); }
const adapter = new KoreanPolicyAdapter();
const sample = adapter.calculate({ birthDate: "1995-05-20", birthTime: "20:20", gender: "female", calendar: "solar" });
const positions = (branches: string): BranchPosition[] => [...branches].map((branch, index) => ({ id: `natal-${index}`, scope: "natal", stem: "甲", branch }));
const relations = (branches: string) => findAdvancedRelations(positions(branches), "natal");
const kinds = (branches: string) => relations(branches).map(item => item.kind).sort();
function synthetic(pillars: string[]): Myeongsik {
  const result = structuredClone(sample);
  (["year", "month", "day", "hour"] as PillarName[]).forEach((name, index) => {
    const [heavenlyStem, earthlyBranch] = [...pillars[index]];
    Object.assign(result.pillars[name], { ganZhi: pillars[index], heavenlyStem, earthlyBranch });
  });
  result.dayMaster = result.pillars.day.heavenlyStem;
  return result;
}

check("coexisting relations survive and reversing the pair changes no relation", () => {
  assert.deepEqual(kinds("寅亥"), ["break", "combination"]);
  assert.deepEqual(kinds("巳申"), ["break", "combination", "punishment"]);
  assert.deepEqual(kinds("寅巳"), ["harm", "punishment"]);
  assert.deepEqual(kinds("子未"), ["harm"]);
  assert.deepEqual(kinds("卯午"), ["break"]);
  assert.deepEqual(kinds("子卯"), ["punishment"]);
  assert.deepEqual(kinds("子寅"), []);
  for (const a of "子丑寅卯辰巳午未申酉戌亥") for (const b of "子丑寅卯辰巳午未申酉戌亥") assert.deepEqual(kinds(a + b), kinds(b + a));
});
check("self punishment requires two positions and only four specific branches", () => {
  assert.deepEqual(relations("亥"), []);
  for (const branch of "辰午酉亥") assert.deepEqual(kinds(branch + branch), ["self-punishment"]);
  for (const branch of "子丑寅卯巳未申戌") assert.deepEqual(kinds(branch + branch), []);
  assert.equal(relations("亥亥亥").length, 3, "Separate positions must remain traceable");
});
check("partial and complete three punishments have different evidence", () => {
  assert(relations("寅巳").some(item => item.kind === "punishment" && item.completeness === "partial-triple"));
  assert(!relations("寅巳巳").some(item => item.kind === "triple-punishment"));
  for (const branches of ["寅巳申", "丑戌未"]) {
    const complete = relations(branches).filter(item => item.kind === "triple-punishment");
    assert.equal(complete.length, 1);
    assert.equal(complete[0].completeness, "complete-triple");
    assert.equal(new Set(complete[0].members.map(member => member.branch)).size, 3);
  }
});
check("annual and monthly facts require an actual incoming member", () => {
  const natal = positions("寅巳辰");
  const incoming: BranchPosition = { id: "annual", scope: "annual", stem: "丙", branch: "申" };
  const found = findAdvancedRelations([...natal, incoming], "annual", incoming.id);
  assert(found.length > 0);
  assert(found.every(item => item.members.some(member => member.id === "annual")));
  assert(found.some(item => item.kind === "triple-punishment"));
  const derived = extractAdvancedMyeongri(sample);
  for (const relation of derived.relations.filter(item => item.scope === "monthly")) {
    const monthlyMembers = relation.members.filter(member => member.scope === "monthly");
    assert.equal(monthlyMembers.length, 1, "Two different months must never combine into one relation");
  }
});
check("real sample has year-specific noble support with its exact day-stem anchor", () => {
  const found = extractAdvancedMyeongri(sample);
  const noble = found.shinsal.find(item => item.name === "천을귀인" && item.scope === "annual")!;
  assert(noble);
  assert.deepEqual(noble.anchors, [{ pillar: "day", value: "辛" }]);
  assert.equal(noble.target.branch, "午");
  const horse = found.shinsal.find(item => item.name === "역마" && item.target.pillar === "month")!;
  assert.deepEqual(horse.anchors, [{ pillar: "year", value: "亥" }, { pillar: "day", value: "亥" }]);
  assert.equal(horse.target.branch, "巳");
  assert.equal(found.strength.status, "undetermined");
  assert.equal(found.yongshin.status, "undetermined", "A mixed chart must not get a forced yongshin");
  assert.equal(found.pattern.status, "undetermined");
});
check("noble, travel, peach blossom and canopy fixtures retain independent anchors", () => {
  const chart = synthetic(["甲子", "己寅", "甲辰", "辛酉"]);
  const found = extractAdvancedMyeongri(chart).shinsal;
  assert(found.some(item => item.name === "역마" && item.target.pillar === "month"));
  assert(found.some(item => item.name === "도화" && item.target.pillar === "hour"));
  assert(found.some(item => item.name === "화개" && item.target.pillar === "day"));
  assert(!found.some(item => item.name === "천을귀인" && item.scope === "natal"));
  chart.pillars.hour.earthlyBranch = "丑";
  assert(extractAdvancedMyeongri(chart).shinsal.some(item => item.name === "천을귀인" && item.target.pillar === "hour"));
});
check("season, real roots and visible help agree before a strong candidate is used", () => {
  const chart = synthetic(["壬午", "乙卯", "甲辰", "丙子"]);
  const found = extractAdvancedMyeongri(chart);
  assert.equal(found.strength.tendency, "strong");
  assert.equal(found.strength.status, "candidate");
  assert.equal(found.strength.season.state, "왕");
  assert(found.strength.roots.some(root => root.pillar === "month" && root.main));
  assert.equal(found.pattern.candidates[0].name, "양인격");
  assert.equal(found.pattern.status, "candidate");
  assert.deepEqual(found.yongshin.candidates.map(item => item.element), ["fire"]);
  assert.equal(found.yongshin.status, "conditional");
});
check("weak candidate uses supporting directions, never a single definitive lucky element", () => {
  const chart = synthetic(["丁巳", "辛酉", "乙亥", "戊子"]);
  const found = extractAdvancedMyeongri(chart);
  assert.equal(found.strength.tendency, "weak");
  assert.equal(found.strength.status, "candidate");
  assert.equal(found.pattern.candidates[0].name, "칠살격");
  assert.equal(found.pattern.status, "candidate");
  assert.deepEqual(found.yongshin.candidates.map(item => item.element), ["water", "wood"]);
  assert(found.yongshin.candidates.every(item => ["resource", "peer"].includes(item.role)));
});
check("unknown time erases all hour influence and withholds final structure candidates", () => {
  const chart = synthetic(["壬午", "乙卯", "甲辰", "丙子"]);
  chart.input.birthTimeKnown = false;
  const before = extractAdvancedMyeongri(chart);
  chart.pillars.hour = { ...chart.pillars.hour, heavenlyStem: "己", earthlyBranch: "丑", ganZhi: "己丑" };
  const after = extractAdvancedMyeongri(chart);
  assert.deepEqual(after, before);
  assert.equal(before.strength.status, "undetermined");
  assert.equal(before.pattern.status, "undetermined");
  assert.deepEqual(before.yongshin.candidates, []);
  assert(!JSON.stringify(before).includes("natal-hour"));
});
check("special patterns, transformation questions and unresolved month commands are withheld", () => {
  const cases = [
    { pillars: ["壬午", "戊辰", "甲子", "丙戌"], reason: "earth-month-command-not-resolved" },
    { pillars: ["壬亥", "乙卯", "甲辰", "丁未"], reason: "complete-branch-group-needs-transformation-review" },
    { pillars: ["壬午", "乙卯", "甲辰", "己巳"], reason: "day-stem-combination-needs-review" },
    { pillars: ["辛酉", "丙午", "甲戌", "己丑"], reason: "rootless-chart-needs-special-pattern-review" },
  ];
  for (const fixture of cases) {
    const found = extractAdvancedMyeongri(synthetic(fixture.pillars));
    assert(found.strength.blockers.includes(fixture.reason), fixture.reason);
    assert.equal(found.strength.status, "undetermined");
    assert.deepEqual(found.yongshin.candidates, []);
  }
});
check("month pattern needs exposure and competing candidates are not silently discarded", () => {
  const none = extractAdvancedMyeongri(synthetic(["甲寅", "乙巳", "壬子", "辛亥"])).pattern;
  assert.equal(none.status, "undetermined");
  assert(none.blockers.includes("month-hidden-stem-not-exposed"));
  const competing = extractAdvancedMyeongri(synthetic(["壬午", "癸亥", "戊辰", "甲寅"])).pattern;
  assert.equal(competing.candidates.length, 2);
  assert.equal(competing.status, "undetermined");
  assert(competing.blockers.includes("multiple-exposed-month-candidates"));
});
check("earth day blade references the peer hidden stem, never the fire main stem", () => {
  const result = extractAdvancedMyeongri(synthetic(["庚申", "壬午", "戊辰", "乙卯"]));
  const candidate = result.pattern.candidates.find(item => item.name === "양인격")!;
  assert(candidate);
  assert.equal(candidate.stem, "己");
  assert.equal(tenGod("戊", candidate.stem), candidate.tenGod);
});
check("invalid day-master or duplicate monthly identities fail before creating evidence", () => {
  const wrongDay = structuredClone(sample);
  wrongDay.dayMaster = "甲";
  assert.throws(() => extractAdvancedMyeongri(wrongDay), /간지/);
  const duplicate = structuredClone(sample);
  duplicate.fortune.monthly[1].ordinal = duplicate.fortune.monthly[0].ordinal;
  assert.throws(() => extractAdvancedMyeongri(duplicate), /월운 순번/);
});
check("changing fortune periods cannot retroactively change natal strength or pattern", () => {
  const before = extractAdvancedMyeongri(sample);
  const changed = structuredClone(sample);
  changed.fortune.yearly.find(item => item.year === 2026)!.ganZhi = "乙巳";
  changed.fortune.daYun.forEach(period => { period.ganZhi = "壬子"; });
  const after = extractAdvancedMyeongri(changed);
  assert.deepEqual(before.strength, after.strength);
  assert.deepEqual(before.pattern, after.pattern);
  assert.deepEqual(before.yongshin, after.yongshin);
  assert.notDeepEqual(before.relations, after.relations);
});
check("old v1 charts derive the new rules without migration, mutation or month-order drift", () => {
  const original = JSON.stringify(sample);
  const result = extractAdvancedMyeongri(sample);
  assert.equal(JSON.stringify(sample), original);
  const reversed = structuredClone(sample);
  reversed.fortune.monthly.reverse();
  assert.deepEqual(extractAdvancedMyeongri(reversed), result);
  const legacy = structuredClone(sample);
  delete (legacy.input as { birthTimeKnown?: boolean }).birthTimeKnown;
  assert.deepEqual(extractAdvancedMyeongri(legacy), result);
});
check("selected advanced fragments carry real grounds, scoped terminology and no canned scenes", () => {
  for (const chart of [sample, synthetic(["壬午", "乙卯", "甲辰", "丙子"]), synthetic(["丁巳", "辛酉", "乙亥", "戊子"])]) {
    const context = buildReportRenderPayload(chart);
    const allFactIds = new Set(context.reportFacts.facts.map(fact => fact.id));
    assert.equal(allFactIds.size, context.reportFacts.facts.length);
    checkObservationContract(context);
    for (const id of context.payload.advanced_context.evidence_ids) {
      assert(context.payload.observations.some(item => item.id === id));
    }
    assert(context.payload.advanced_context.evidence_ids.length > 0);
    const serialized = JSON.stringify(context.payload);
    assert(!serialized.includes("1995-05-20"));
    assert(!serialized.includes("20:20"));
    assert(!Object.hasOwn(context.payload, "advanced"), "Unselected full monthly tables must not bloat the prompt");
  }
  const context = buildReportRenderPayload(sample);
  assert(context.payload.sections.find(section => section.id === "relation")!.advanced_terms.includes("천을귀인"));
  assert(!context.payload.sections.some(section => section.advanced_terms.includes("신약") || section.advanced_terms.includes("용신")));
});
check("short relation words do not confuse ordinary Korean or leak technical labels into styling", () => {
  for (const word of ["형", "해", "파"]) assert(hasReportTerm(`서로 맞춰 가는 관계 (${word})로 읽어.`, word));
  assert(!hasReportTerm("올해에는 편하게 해. 형에게 상황을 파악해 달라고 말해.", "해"));
  assert(!hasReportTerm("형에게 상황을 파악해 달라고 말해.", "형"));
  assert(!hasReportTerm("형에게 상황을 파악해 달라고 말해.", "파"));
  assert.equal(splitReportTermAnnotations("도움을 청하는 표시 (천을귀인)").filter(part => part.isTerm).length, 1);
});
check("unsupported and certain advanced claims stay blocked even during style recovery", () => {
  assert.equal(getAdvancedReportIssues("도움을 찾는 표시 (천을귀인)를 함께 읽어.", ["천을귀인"]).length, 0);
  assert(getAdvancedReportIssues("너는 신약이야.", ["신약"]).length);
  assert(getAdvancedReportIssues("네 용신은 수로 확정됐어.", ["용신"]).length);
  assert(getAdvancedReportIssues("올해는 삼형이 있어.", ["형"]).length);
  assert(getAdvancedReportIssues("너는 종재격이야.", []).length);
  assert(getAdvancedReportIssues("신강약은 undetermined야.", []).length);
  for (const label of ["observations", "anchor_evidence_ids", "natal-season", "life-stage-monthly-9"]) assert(getAdvancedReportIssues(`${label}를 읽어.`, []).length);
  for (const term of ["삼합", "방합"]) {
    assert(getAdvancedReportIssues(`${term}이 있어.`, []).length);
    assert.deepEqual(getAdvancedReportIssues(`${term}이 있어.`, [term]), []);
  }
  assert.equal(getAdvancedReportIssues("형에게 도움을 청해. 올해 할 일을 파악해.", []).length, 0);
  const context = buildReportRenderPayload(sample);
  const fixture = JSON.parse(fs.readFileSync("scripts/fixtures/report-style-draft.json", "utf8")) as { paragraphs: string[] };
  const draft = { sections: fixture.paragraphs.map((paragraph, index) => ({ section_id: context.payload.sections[index].id, paragraph, evidence_uses: [] })) };
  draft.sections[1].paragraph += " 너에게 천덕귀인이 들어와.";
  for (const allowStyleIssues of [false, true]) assert.throws(() => validateReport(draft, context, "테스트", allowStyleIssues), /천덕귀인/u);
});

console.log(`Advanced myeongri checks: ${checks} groups passed; no network/database/model calls.`);
