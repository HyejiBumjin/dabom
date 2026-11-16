/** Original modern Korean readings, not quotations or translated passages.
 * Public-domain sources / rule boundaries: docs/myeongri-advanced-rules.md.
 * Calculated observations and editorial interpretations are kept separate.
 */
import type { CorpusFragment } from "./interpretation-corpus";
import type { ReportDomain, ReportFacts, SajuFact } from "./report-facts";
import type { ElementLink, LifeStage } from "./myeongri-synthesis";
import { getTenGodPlainMeaning } from "./report-terminology";

export const LIFE_STAGE_MEANINGS: Record<LifeStage, string> = {
  장생: "익숙하지 않은 일을 배우며 키워 가는 단계로 읽는 보조 표시.",
  목욕: "새 환경에 맞는 표현과 방식을 찾아 가는 단계로 읽는 보조 표시.",
  관대: "준비한 것을 밖으로 보여 주고 역할을 갖추는 단계로 읽는 보조 표시.",
  임관: "익힌 것을 직접 맡아 쓰는 단계로 읽는 보조 표시.",
  제왕: "이미 갖춘 힘을 적극적으로 쓰는 단계로 읽는 보조 표시.",
  쇠: "넓히기보다 이미 익힌 것에서 중요한 부분을 남기는 단계로 읽는 보조 표시.",
  병: "바깥으로 넓히는 일보다 안에서 살피고 다듬는 단계로 읽는 보조 표시.",
  사: "하나에 깊이 집중하며 다음 방식으로 넘어갈 준비를 하는 단계로 읽는 보조 표시.",
  묘: "쌓인 경험을 모아 두고 필요한 곳에 꺼내 쓰는 단계로 읽는 보조 표시.",
  절: "익숙한 흐름의 끝에서 다른 시작을 준비하는 단계로 읽는 보조 표시.",
  태: "아직 드러나지 않은 생각과 가능성을 기르는 단계로 읽는 보조 표시.",
  양: "새로 시작할 일을 충분히 익히고 돌보는 단계로 읽는 보조 표시.",
};
export const SYNTHESIS_TERM_MEANINGS: Record<string, string> = {
  ...LIFE_STAGE_MEANINGS,
  조후: "태어난 계절의 차고 더운 기운과 사주 안의 불·물 기운을 함께 읽는 관점.",
  통근: "겉으로 드러난 기운이 사주 안에도 같은 오행의 바탕을 둔 구성.",
  투출: "사주 안에 담긴 글자와 같은 글자가 겉에도 드러난 구성.",
};
const LINK_MEANING: Record<ElementLink, string> = {
  same: "여러 해의 바탕과 올해가 같은 오행 쪽을 향한다. 같은 관심이 이어지는 면과 한쪽에 몰리는 면을 함께 읽는다.",
  produces: "여러 해의 바탕이 올해의 기운을 생한다. 바탕에서 쌓인 것이 올해 주제를 드러내는 데 쓰이며 그만큼 들어가는 수고도 함께 읽는다.",
  "produced-by": "올해의 기운이 여러 해의 바탕을 생한다. 올해의 활동이 길게 이어 온 주제에 다시 보태지는 방향으로 읽는다.",
  controls: "여러 해의 바탕이 올해의 기운을 제어한다. 오래 중요하게 여긴 것과 올해 요구 사이에서 조정할 부분이 드러나는 구조다.",
  "controlled-by": "올해의 기운이 여러 해의 바탕을 제어한다. 익숙하게 이어 온 방식에 올해 다른 조건이 붙는 방향으로 읽는다.",
};
export interface PrimaryInterpretation { grounds: string[]; observation: string; reading: string; boundary: string }

export function buildSynthesisReportEvidence(facts: ReportFacts, version: string) {
  const fragments: Record<ReportDomain, CorpusFragment[]> = { essence: [], yearly: [], relation: [], career: [], mental: [], summary: [] };
  const terms: Record<ReportDomain, string[]> = { essence: [], yearly: [], relation: [], career: [], mental: [], summary: [] };
  const primary: Partial<Record<ReportDomain, PrimaryInterpretation>> = {};
  const evidence: SajuFact[] = [];
  const add = (domain: ReportDomain, id: string, basis: unknown, scope: string, reading: string, boundary: string, names: string[] = [], main = false) => {
    const observation = typeof basis === "string" ? basis : JSON.stringify(basis);
    evidence.push({ id, type: "structure", value: reading, basis: observation, timeScope: scope });
    terms[domain].push(...names);
    const grounds = [id, "annual-ten-god"];
    fragments[domain].push({ id: `F-${id}`, status: "approved", version, domains: [domain], direction: "mixed", strength: main ? 5 : 2,
      conditions: [], grounds, mechanism: observation, translation: reading, concreteScene: "", sceneAnchors: [],
      expansion: { mechanismSteps: [scope, reading], sceneVariants: [], decisionRule: "조언을 더하기보다 이 근거가 올해 흐름을 어떻게 다르게 만드는지 설명한다.", repetitionGuard: "이 내용은 배정된 주제 안에서만 사용한다. 다른 주제에서 정의나 결론을 되풀이하지 않는다." },
      guidance: boundary + " 기록된 위치·시간은 근거 확인용이며 본문에서는 쉬운 뜻으로 풀고 내부 표기는 생략한다. 성격·실제 과거·미래 사건을 만들어 내지 않는다.",
    });
    if (main) primary[domain] = { grounds, observation, reading, boundary };
  };
  const s = facts.synthesis;
  const monthExposed = s.natal.exposures.filter(item => item.hiddenAt === "month");
  const monthMain = monthExposed.find(item => item.main);
  const rootMain = s.natal.roots.filter(item => item.main && !item.contested);
  const rootSecondary = s.natal.roots.filter(item => !item.main);
  const visibleSupport = facts.advanced.strength.visibleSupport;
  const season = s.natal.season.supports ? "계절에서도 일간을 생하거나 같은 편이 되는 기운을 받는다" : "계절의 주된 기운은 일간과 같은 편보다 표현·실속·책임 쪽에 놓인다";
  const exposureReading = monthMain
    ? `태어난 달의 중심인 ${monthMain.tenGod}가 겉에도 같은 글자로 이어진다. ${getTenGodPlainMeaning(monthMain.tenGod)}이라는 바탕이 올해 ${getTenGodPlainMeaning(facts.annualTenGod)}과 만나는 흐름을 먼저 읽는다.`
    : monthExposed.length
      ? `태어난 달 안의 보조 기운 ${monthExposed.map(item => item.tenGod).join("·")}가 겉에 이어진다. 달의 중심인 ${facts.natalMonthMainTenGod}만으로 해석을 끝내지 않고, 실제 드러난 ${monthExposed.map(item => getTenGodPlainMeaning(item.tenGod)).join(" / ")}과 올해의 주제가 함께 움직이는 면을 읽는다.`
      : `태어난 달의 중심인 ${facts.natalMonthMainTenGod}와 겉에 드러난 ${facts.natalMonthTenGod}를 구별한다. 안에 담긴 ${getTenGodPlainMeaning(facts.natalMonthMainTenGod)}과 밖에서 쓰는 ${getTenGodPlainMeaning(facts.natalMonthTenGod)}이 올해의 ${getTenGodPlainMeaning(facts.annualTenGod)}과 만나는 차이를 읽는다.`;
  const supportReading = rootMain.length ? "같은 기운의 중심 뿌리도 있어 자기 방식을 이어 가는 바탕을 함께 읽는다."
    : rootSecondary.length || visibleSupport.length ? "같은 편의 도움은 보조 뿌리나 겉에 드러난 기운에서 읽는다. 이를 계절의 도움과 똑같이 취급하지 않는다." : "올해의 요구를 설명할 때 사주에서 확인된 표현·실속·책임의 기운 사이 관계를 중심으로 읽는다.";
  add("yearly", "synthesis-natal", { season: s.natal.season, monthExposures: monthExposed, roots: s.natal.roots, visibleSupport }, "원국의 계절·월령·투출·통근 → 올해와 비교",
    `${exposureReading} ${season}. ${supportReading}`, "이 바탕에서 올해 중심 흐름의 이유 한 가지를 골라 쉽게 설명한다. 모든 항목을 나열하거나 뿌리 개수로 강약을 확정하지 않는다. 투출은 정확히 같은 천간, 통근은 같은 오행을 확인한 서로 다른 관찰이다.", ["통근", "투출"], true);

  const cycleLink = s.stemLinks.find(item => item.from === "da-yun")!;
  const echo = s.annualEcho;
  const echoReading = echo.visibleAt.length ? "올해와 같은 글자가 원래 사주 겉에도 있다. 원래 드러나 있던 주제가 올해에도 이어지는 쪽이다."
    : echo.hiddenAt.length ? "올해와 같은 글자는 원래 사주 안에 담겨 있다. 안에 있던 주제가 올해 겉으로 드러나는 구조로 비교한다."
      : "여러 해의 바탕과 올해의 방향 사이 생극 관계를 중심으로 읽는다.";
  add("career", "synthesis-cycle-annual", { link: cycleLink, annualToDay: s.stemLinks.find(item => item.to === "day"), echo }, "현재 대운의 여러 해 배경 → 올해의 돈·대가",
    `${facts.daYunTenGod}: ${getTenGodPlainMeaning(facts.daYunTenGod)} / ${facts.annualTenGod}: ${getTenGodPlainMeaning(facts.annualTenGod)}. ${LINK_MEANING[cycleLink.relation]} ${echoReading}`,
    "생은 이익, 극은 손해라는 뜻이 아니다. 두 십신이 가리키는 활동을 주어로 삼아 무엇이 무엇에 쓰이는지 설명한다. 천간합이 있어도 합화·오행 변환을 선언하지 않는다. 소득·투자수익·직업을 확정하지 않는다.", [], true);

  const climate = s.climate;
  const thermal = climate.thermal === "warm" ? "더운 계절" : climate.thermal === "cold" ? "차가운 계절" : "기온이 바뀌는 계절";
  const climateReading = climate.seasonalDirection === "reinforces" ? "올해 천간은 태어난 계절의 차거나 더운 방향을 더한다. 올해 십신의 주제가 두드러지는 면과 그쪽에만 힘을 쓸 때 생기는 부담을 함께 읽는 보조 관점이다."
    : climate.seasonalDirection === "counterbalances" ? "올해 천간은 태어난 계절과 반대의 온도 방향을 보탠다. 익숙한 기운에 다른 방향이 더해진다는 보조 관점이며 저절로 균형이 완성된다는 뜻은 아니다."
      : "계절의 온도만으로 올해의 유불리를 정하지 않는다. 원래 사주의 불·물 기운이 겉과 안에 놓인 위치를 올해의 요구와 비교하는 보조 관점이다.";
  // A seasonal marker alone never determines a favorable element or a temperament.
  add("mental", "synthesis-climate", climate, "태어난 계절의 한난·조습 지표와 올해 천간의 방향",
    `${thermal}의 사주다. ${climateReading} 불·물은 실제 확인된 위치에 한해서만 언급한다.`,
    "조후는 현재 이야기의 부담·균형을 보충할 때만 짧게 사용한다. 더운 계절→급한 성격, 차가운 계절→차가운 마음으로 연결하지 않는다. 물이 있으면 해결·화가 많으면 불운·특정 오행이 조후용신이라는 결론, 건강·기후·행운 물건 예측은 금지한다.", ["조후"]);
  const annualStage = s.lifeStages.find(item => item.scope === "annual")!;
  add("mental", "synthesis-annual-life-stage", { dayMaster: facts.dayMaster, ...annualStage, convention: "양순음역·화토동궁" }, `${facts.targetYear}년 세운 지지, 일간 기준 십이운성`,
    `${LIFE_STAGE_MEANINGS[annualStage.stage]} 올해 ${getTenGodPlainMeaning(facts.annualTenGod)}이라는 큰 주제에서 일을 키우는지, 쓰는지, 다듬는지 설명하는 보조 관점으로만 사용한다.`,
    "십이운성 한 글자로 사람의 생애·건강·강약·성패를 판정하지 않는다. 병·사는 질병·죽음, 묘는 무덤, 절은 관계 단절, 태·양은 임신·출산 예언이 아니다. 조후와 운성을 모두 정의하느라 본래 주제를 끊지 말고 자연스럽게 맞는 한 가지를 우선 사용한다.", [annualStage.stage]);
  return { fragments, facts: evidence, terms, primary };
}
