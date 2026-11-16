/**
 * Original Korean editorial interpretations, not classical quotations.
 * Rule sources: docs/myeongri-advanced-rules.md (public-domain originals only).
 * Every selected fragment carries calculated evidence IDs and a time scope.
 * No fixed scenes, modern book translations, or third-party prose are included.
 */
import type { CorpusFragment } from "./interpretation-corpus";
import type { ReportDomain, ReportFacts, SajuFact } from "./report-facts";
import type { AdvancedRelation, EvidenceScope, ShinsalEvidence } from "./advanced-myeongri";
import { assignTopicTiming, type TopicTiming, TIMING_DOMAINS } from "./report-topic-timing";
import { getTenGodPlainMeaning } from "./report-terminology";

export const ADVANCED_TERM_MEANINGS: Record<string, string> = {
  형: "함께 움직이는 방식이 부딪혀, 서로 지킬 선과 순서를 살피는 관계.",
  삼형: "세 가지 기운이 함께 맞물려, 한 곳을 바꿀 때 다른 곳도 함께 살피는 관계.",
  자형: "같은 작용이 겹쳐 한쪽에 힘이 몰리는지 살피는 관계.",
  해: "함께 이어지려는 일에서 서로 기대한 부분이 맞는지 살피는 관계.",
  파: "이미 맞춰 둔 방식 중 다시 고칠 부분을 살피는 관계.",
  천을귀인: "막힌 일을 풀 때 도움을 청할 사람과 방법을 살피는 전통적인 표시.",
  역마: "자리를 옮기거나 활동하는 곳을 넓히는 일을 살피는 전통적인 표시.",
  도화: "다른 사람에게 나를 보여 주고 관심을 주고받는 일을 살피는 전통적인 표시.",
  화개: "혼자 집중하며 배움이나 표현을 깊게 다듬는 일을 살피는 전통적인 표시.",
  신강: "태어난 계절과 사주 안에서 나를 받쳐 주는 힘이 함께 드러나는 쪽.",
  신약: "태어난 계절에서 받는 도움과 나를 받쳐 주는 힘을 더 살피는 쪽.",
  용신: "사주 안의 힘을 고르게 쓰기 위해 무엇을 보완할지 살피는 방향.",
  격국: "태어난 달의 기운이 다른 사주 글자와 어떻게 이어지는지 정리하는 틀.",
  건록격: "태어난 달에 나와 같은 힘이 뿌리를 두어 스스로 해내는 쪽을 살피는 틀.",
  양인격: "태어난 달에 강한 같은 편의 힘이 놓여, 어디에 힘을 쓸지 살피는 틀.",
  월겁격: "태어난 달의 같은 편 기운을 바탕으로 함께하는 일과 내 몫을 살피는 틀.",
};
for (const god of ["식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"]) {
  ADVANCED_TERM_MEANINGS[god === "편관" ? "칠살격" : `${god}격`] = `태어난 달의 바탕에서 ${getTenGodPlainMeaning(god).replace(/\.$/u, "")}을 중심으로 읽는 틀.`;
}

type RuleReading = { term: string; meaning: string; decision: string };
const RELATION_READINGS: Partial<Record<AdvancedRelation["kind"], RuleReading>> = {
  punishment: { term: "형", meaning: "서로의 작용이 순조롭게 이어지기보다 맞부딪히는 부분을 읽는다.", decision: "서로 원하는 방법이 다르면 누구 잘못인지부터 정하기보다 각자 지킬 선과 진행 순서를 나눈다." },
  "triple-punishment": { term: "삼형", meaning: "세 기운의 연결을 함께 읽는다. 하나만 바꿀 때 다른 약속과 일에 미치는 영향을 함께 살핀다.", decision: "새 선택 하나를 할 때 이미 연결된 다른 일에 필요한 변화도 함께 정한다. 세 가지 재난이나 세 사람의 갈등으로 해석하지 않는다." },
  "self-punishment": { term: "자형", meaning: "같은 지지의 작용이 거듭 놓인 구성이다. 같은 방향에 힘을 지나치게 쓰는지 살피는 전통 해석이다.", decision: "올해의 십신이 뜻하는 일을 늘릴 때 다른 일에 남겨 둘 힘도 함께 살핀다. 반복 확인·불안·우울 같은 성격이나 질환을 이 관계에서 만들어 내지 않는다." },
  harm: { term: "해", meaning: "서로 연결되려는 기운의 기대가 어긋나는 부분을 살피는 전통 관계다.", decision: "함께 하자는 말이 같아도 원하는 결과가 같은지 먼저 맞춘다. 상대의 속마음이나 배신을 예측하지 않는다." },
  break: { term: "파", meaning: "이미 이어진 방식의 일부를 다시 손질하는 쪽으로 읽는 보조 관계다.", decision: "새 조건과 맞지 않는 부분만 고쳐 이어 가는 선택을 살핀다. 관계나 일 전체가 깨진다는 결론으로 넓히지 않는다." },
};
const STAR_READINGS: Record<ShinsalEvidence["name"], { domain: ReportDomain; meaning: string; decision: string }> = {
  천을귀인: { domain: "relation", meaning: "도움과 연결을 살피는 전통 보조 표시다. 올해의 십신이 가리키는 일과 함께 읽는다.", decision: "막힌 부분에 필요한 경험을 가진 사람에게 구체적인 질문을 건네는 쪽을 살핀다. 반드시 도와줄 인물이 등장한다거나 어려움이 저절로 해결된다고 쓰지 않는다." },
  도화: { domain: "relation", meaning: "나를 보여 주는 방식과 관심을 주고받는 일을 살피는 전통 보조 표시다.", decision: "관심받는 것과 오래 맞는 관계를 구분하고, 내가 무엇을 보여 주고 싶은지 고른다. 외모·인기·연애·결혼·불륜이 정해졌다고 쓰지 않는다." },
  역마: { domain: "career", meaning: "이동과 활동 범위의 변화를 살피는 전통 보조 표시다.", decision: "다른 곳이나 새로운 방식에서 일할 선택이 생기면 얻는 경험과 바뀌는 생활을 함께 비교한다. 실제 이직·이사·출장·해외 진출이 일어난다고 예언하지 않는다." },
  화개: { domain: "mental", meaning: "혼자 몰입하며 익히고 표현하는 일을 살피는 전통 보조 표시다.", decision: "혼자 다듬을 시간과 다른 사람의 반응을 들을 시간을 나눈다. 외로움·종교·예술 재능이나 성격을 확정하지 않는다." },
};
const SCOPE_RANK: Record<EvidenceScope, number> = { annual: 0, "da-yun": 1, natal: 2, monthly: 3 };
const POSITION_KO: Record<string, string> = { year: "태어난 해", month: "태어난 달", day: "태어난 날", hour: "태어난 시각" };

export function buildAdvancedReportEvidence(facts: ReportFacts, version: string, timing: TopicTiming = assignTopicTiming(facts)) {
  const fragments: Record<ReportDomain, CorpusFragment[]> = { essence: [], yearly: [], relation: [], career: [], mental: [], summary: [] };
  const evidence: SajuFact[] = [];
  const terms: Record<ReportDomain, string[]> = { essence: [], yearly: [], relation: [], career: [], mental: [], summary: [] };
  const scopeText = (scope: EvidenceScope) => scope === "natal" ? "태어난 사주의 바탕" : scope === "annual" ? `${facts.targetYear}년 (현재 대운이 참여하면 여러 해의 배경도 구분)` : scope === "da-yun" ? "현재 대운의 여러 해 배경" : "해당 월의 실제 날짜 범위";
  const add = (domain: ReportDomain, id: string, grounds: SajuFact[], termNames: string[], mechanism: string, translation: string, decision: string, guidance: string) => {
    for (const ground of grounds) if (!evidence.some(item => item.id === ground.id)) evidence.push(ground);
    terms[domain].push(...termNames);
    fragments[domain].push({ id: `F-${id}`, version, status: "approved", domains: [domain], direction: "mixed", strength: 3,
      conditions: [], grounds: [...grounds.map(ground => ground.id), "annual-ten-god"], mechanism, translation,
      concreteScene: "", sceneAnchors: [], expansion: { mechanismSteps: [mechanism, `올해 ${facts.annualTenGod}: ${getTenGodPlainMeaning(facts.annualTenGod)}`, translation], sceneVariants: [], decisionRule: decision, repetitionGuard: "이 보충 근거는 배정된 주제 한 곳에서만 풀고, 기존 메시지의 조언과 같은 뜻이면 새 의미가 있는 부분만 잇는다." },
      guidance: `${guidance} 고전의 인용문이 아닌 다봄의 현대적 해설이다. 길흉·질병·사고·성공을 확정하지 않는다. 쉬운 말로 먼저 설명하고 용어는 꼭 필요할 때만 괄호로 붙인다.`,
    });
  };
  // A compact, meaningful addition to the annual story, not a list of every hit.
  const priority: Partial<Record<AdvancedRelation["kind"], number>> = { "triple-punishment": 0, punishment: 1, harm: 2, "self-punishment": 3, break: 4 };
  const annual = facts.advanced.relations.filter(relation => relation.scope === "annual" && RELATION_READINGS[relation.kind])
    .sort((a, b) => (priority[a.kind]! - priority[b.kind]!) || a.id.localeCompare(b.id));
  const chosenRelation = annual[0];
  if (chosenRelation) {
    const reading = RELATION_READINGS[chosenRelation.kind]!;
    const memberIds = chosenRelation.members.map(member => member.id).sort().join(",");
    const companions = facts.advanced.relations.filter(relation => relation.scope === "annual" && relation.members.map(member => member.id).sort().join(",") === memberIds && relation.id !== chosenRelation.id);
    const basis = chosenRelation.members.map(member => `${member.id}:${member.stem}${member.branch}`).join(" ↔ ");
    const coexistence = companions.length ? ` 같은 위치에서 ${companions.map(item => item.kind).join("·")}도 계산되므로 이 관계 하나로 다른 관계를 없애지 않는다.` : "";
    add("yearly", chosenRelation.id, [{ id: chosenRelation.id, type: "interaction", value: reading.term, basis: `${basis}; ${chosenRelation.rule}; ${chosenRelation.completeness}${coexistence}`, timeScope: scopeText("annual") }], [reading.term],
      `${basis}에서 ${reading.term} 관계를 확인했다. ${reading.meaning}${coexistence}`, "올해 십신이 가리키는 일에서 이 관계가 바꾸는 선택 하나를 덧붙인다.", reading.decision,
      "확인된 위치와 시간 범위를 지킨다. 삼형은 세 가지가 모두 있는 경우만 말한다. 자기 자신과 비교해서 자형을 만들거나 일반 중복을 자형으로 부르지 않는다.");
  }

  // Add one distinct relation within an already-selected, dated month. Never
  // invent another month or combine branches from two different months.
  const monthly = facts.advanced.relations.filter(relation => relation.scope === "monthly" && RELATION_READINGS[relation.kind]
    && relation.members.some(member => member.scope === "monthly" && facts.monthlyRelationMonths.some(month => month.ordinal === member.ordinal)))
    .sort((a, b) => (priority[a.kind]! - priority[b.kind]!) || a.id.localeCompare(b.id));
  const chosenMonthRelation = monthly[0];
  if (chosenMonthRelation) {
    const ordinal = chosenMonthRelation.members.find(member => member.scope === "monthly")!.ordinal;
    const month = facts.monthlyRelationMonths.find(item => item.ordinal === ordinal)!;
    const reading = RELATION_READINGS[chosenMonthRelation.kind]!;
    const basis = chosenMonthRelation.members.map(member => `${member.id}:${member.stem}${member.branch}`).join(" ↔ ");
    const godGround = facts.facts.find(item => item.id === `monthly-${ordinal}-ten-god`)!;
    const owner = TIMING_DOMAINS.find(domain => timing[domain].some(item => item.ordinal === ordinal))!;
    add(owner, chosenMonthRelation.id, [
      { id: chosenMonthRelation.id, type: "monthly-relation", value: reading.term, basis: `${basis}; ${chosenMonthRelation.rule}; ${chosenMonthRelation.completeness}`, timeScope: `${month.startAt} 이상 ${month.endAt} 미만` },
      godGround,
    ], [reading.term], `${month.displayLabel}의 ${month.stemTenGod}와 ${reading.term}을 함께 읽는다. ${reading.meaning}`,
    `이 기간의 ${getTenGodPlainMeaning(month.stemTenGod)}에 어떤 조정이 필요한지 기존 월운 설명 안에 잇는다.`, reading.decision,
    `날짜는 ${month.displayLabel}만 사용한다. ${chosenMonthRelation.completeness === "partial-triple" ? "두 글자 사이의 형 관계이며 완성된 삼형이라고 쓰지 않는다." : "확인된 구성만 사용한다."} 다른 달의 관계나 올해 전체의 관계로 바꾸지 않는다. 이미 계산된 합·충과 함께 설명하며 어느 한쪽이 없어졌다고 쓰지 않는다.`);
  }

  // One star per domain. Annual evidence wins; natal evidence stays natal.
  const stars = [...facts.advanced.shinsal].filter(item => item.scope !== "monthly").sort((a, b) => SCOPE_RANK[a.scope] - SCOPE_RANK[b.scope] || a.id.localeCompare(b.id));
  const usedDomains = new Set<ReportDomain>();
  for (const star of stars) {
    const reading = STAR_READINGS[star.name];
    if (usedDomains.has(reading.domain)) continue;
    usedDomains.add(reading.domain);
    const basis = `${star.anchors.map(anchor => `${anchor.pillar}:${anchor.value}`).join(" / ")} 기준 → ${star.target.id}:${star.target.branch}; ${star.rule}`;
    add(reading.domain, star.id, [{ id: star.id, type: "structure", value: star.name, basis, timeScope: scopeText(star.scope) }], [star.name],
      `${scopeText(star.scope)}에서 ${star.name}의 조회 조건이 확인된다. ${reading.meaning}`, "십신과 올해의 흐름을 보충하는 다른 선택을 설명한다.", reading.decision,
      star.scope === "natal" ? "태어날 때부터 놓인 보조 근거다. 올해 새로 생긴 신살이라고 쓰지 않는다." : "조회된 시간 범위의 보조 근거로만 사용한다. 실제 사건이 발생한 사실이 아니다.");
  }

  const pattern = facts.advanced.pattern;
  if (pattern.status === "candidate") {
    const candidate = pattern.candidates[0];
    add("career", pattern.id, [{ id: pattern.id, type: "structure", value: candidate.name, basis: JSON.stringify(candidate), timeScope: "원국 월령의 격국 후보; 성격·파격·귀천 판정 아님" }], ["격국", candidate.name],
      `월령과 투출을 대조한 ${candidate.name} 후보. ${getTenGodPlainMeaning(candidate.tenGod)}을 월령 해석의 출발점으로 삼는다.`,
      `태어난 달의 ${candidate.tenGod}와 올해 ${facts.annualTenGod}가 알려 주는 일의 방향을 비교한다.`,
      "원래 잘 쓰는 방식이 올해 맡을 일에도 도움이 되는 부분과 새로 배워야 하는 부분을 구분한다. 기존 십신 설명을 다시 늘어놓지 않는다.",
      "격국은 월령 중심 후보이며 격의 성립(成格)·파격·특수격·귀천을 확정하지 않는다. '월령에서 ~ 쪽을 먼저 읽어'처럼 적용 범위를 밝히고 '너는 ~격이야'라고 단정하지 않는다.");
  }
  const strength = facts.advanced.strength;
  const yongshin = facts.advanced.yongshin;
  const rootLocations = [...new Set(strength.roots.map(root => POSITION_KO[root.pillar]))].join("·");
  const supportLocations = strength.visibleSupport.map(item => `${POSITION_KO[item.pillar]}의 ${item.role === "resource" ? "도움을 받는 힘" : "같은 편의 힘"}`).join("·");
  // Even an unresolved overall grade can contribute observed support locations;
  // do not make up a strong/weak verdict just to obtain a yongshin.
  if (strength.roots.length || strength.visibleSupport.length) {
    const label = strength.status === "candidate" ? strength.tendency === "strong" ? "신강" : "신약" : null;
    const summary = [rootLocations && `${rootLocations} 안에 나와 같은 오행의 뿌리가 있다`, supportLocations && `${supportLocations}이 드러나 있다`].filter(Boolean).join(". ");
    const grounds: SajuFact[] = [{ id: strength.id, type: "structure", value: label ? `${label} 경향 후보` : "통근·도움의 확인된 위치", basis: JSON.stringify(strength), timeScope: "원국의 계절·통근·천간 비교; 올해 운세와 별도" }];
    if (yongshin.status === "conditional") grounds.push({ id: yongshin.id, type: "structure", value: "억부용신 후보", basis: JSON.stringify(yongshin), timeScope: "원국의 억부 관점; 조후·격국용신·종격용신 아님" });
    add("mental", strength.id, grounds, [...(label ? [label] : []), ...(yongshin.status === "conditional" ? ["용신"] : [])],
      `${summary}. 계절 상태 ${strength.season.state}, 강약 판단 상태 ${strength.status}.${label ? ` 이 규칙에서는 ${label} 쪽으로 읽는 후보이며 성격·건강의 강약이 아니다.` : " 종합 신강약과 용신 이름은 본문에서 생략한다."}`,
      yongshin.status === "conditional" ? `억부 관점에서 보완할 방향: ${yongshin.candidates.map(item => item.reason).join(" / ")}. 올해의 요구를 감당하는 방법에만 연결한다.` : "계산된 도움의 위치가 올해의 부담을 나누는 데 어떤 의미인지 설명한다.",
      yongshin.status === "conditional" && strength.tendency === "strong" ? "혼자 더 버티는 쪽으로만 힘을 쓰기보다 이미 익힌 것을 말이나 결과물로 꺼내 쓰는 방향을 살핀다." : "혼자 해결할 일과 배움·도움을 써서 풀 일을 나눠, 올해 요구를 감당하는 방법을 설명한다.",
      "신강·신약은 사주 안의 지지 관계를 비교한 경향 후보다. 강한 성격·약한 마음·건강·능력의 우열로 바꾸지 않는다. 용신은 억부 관점의 보완 방향으로만 쓰고 확정·유일·행운 색·물건·지역·투자 추천으로 확대하지 않는다. 상태 undetermined와 blocker는 내부 정보이므로 본문에 나열하지 않는다.");
  }
  for (const domain of Object.keys(terms) as ReportDomain[]) terms[domain] = [...new Set(terms[domain])];
  return { fragments, facts: evidence, terms };
}
