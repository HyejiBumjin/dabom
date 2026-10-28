/**
 * 다봄 자체 작성 해석 자료. 외부의 현대 번역·예문은 사용하지 않는다.
 * 정의 확인: 萬民英, 《三命通會》 卷五「論古人立印食官財名義」 및
 * 卷二「論支元六合」「論沖擊」의 public-domain 한문 원문.
 * https://zh.wikisource.org/wiki/三命通會/卷五
 * https://zh.wikisource.org/wiki/三命通會/卷二
 * 참고 범위는 일간 기준 생극·음양 관계와 육합·육충이다. 아래 생활 언어와
 * 선택 원칙은 다봄의 현대적 설명이며 고전 인용이나 개별 사건의 예측이 아니다.
 * 월지 본기 하나로 격국·용신·신강약·합화 성립을 판정하지 않는다.
 */
import type { CorpusFragment } from "@/lib/saju/interpretation-corpus";

type GodGroup = "peer" | "output" | "asset" | "authority" | "resource";
interface TenGodMeaning {
  group: GodGroup;
  relation: string;
  meaning: string;
  topic: string;
}

/** Time-neutral definitions: the same ten god has distinct natal/year/cycle scopes. */
export const TEN_GOD_MEANINGS: Record<string, TenGodMeaning> = {
  비견: { group: "peer", relation: "일간과 오행·음양이 같은 관계", meaning: "내 기준과 독립성, 동등한 사람들과의 협력을 읽는 기능.", topic: "내 기준과 동등한 역할" },
  겁재: { group: "peer", relation: "일간과 오행은 같고 음양은 다른 관계", meaning: "함께 움직이는 사람들 사이의 경쟁과 몫의 배분을 읽는 기능.", topic: "함께 쓰는 시간과 각자의 몫" },
  식신: { group: "output", relation: "일간이 생하는 오행이며 음양이 같은 관계", meaning: "익힌 것을 표현하고 꾸준히 만들어 내는 활동을 읽는 기능.", topic: "익힌 능력의 표현과 완성" },
  상관: { group: "output", relation: "일간이 생하는 오행이며 음양이 다른 관계", meaning: "자기 표현과 기존 방식에 대한 질문·개선을 읽는 기능.", topic: "내 방식의 표현과 개선" },
  편재: { group: "asset", relation: "일간이 극하는 오행이며 음양이 같은 관계", meaning: "여러 자원과 기회를 연결하고 활용하는 범위를 읽는 기능.", topic: "여러 선택지에 쓸 자원" },
  정재: { group: "asset", relation: "일간이 극하는 오행이며 음양이 다른 관계", meaning: "정해진 자원과 일상의 비용·실속을 관리하는 기능.", topic: "정해진 자원의 관리와 실속" },
  편관: { group: "authority", relation: "일간을 극하는 오행이며 음양이 같은 관계", meaning: "강한 요구와 압박에 대응하고 우선순위를 정하는 기능.", topic: "강한 요구에 대한 대응" },
  정관: { group: "authority", relation: "일간을 극하는 오행이며 음양이 다른 관계", meaning: "공식적인 역할과 약속, 평가 기준을 읽는 기능.", topic: "맡은 역할과 지켜야 할 기준" },
  편인: { group: "resource", relation: "일간을 생하는 오행이며 음양이 같은 관계", meaning: "관점을 바꾸어 익히고 자기에게 맞는 방식을 탐색하는 기능.", topic: "다른 관점의 학습과 탐색" },
  정인: { group: "resource", relation: "일간을 생하는 오행이며 음양이 다른 관계", meaning: "배움과 지원을 받아 판단의 기반을 쌓는 기능.", topic: "배운 내용과 지원의 활용" },
};

/** Structural meanings only; the caller supplies annual or monthly timing. */
export const BRANCH_RELATION_MEANINGS = {
  clash: {
    meaning: "서로 마주하는 지지의 관계로 기존 배치와 새 요구의 조정을 읽는 근거.",
    mechanism: "육충은 서로 마주하는 지지의 관계다. 기존 조건과 새 요구가 다른 방향을 가리킬 때 무엇을 유지하고 조정할지 살피는 관점으로 적용한다.",
    translation: "이미 정한 조건과 새로 맞춰야 할 조건을 구분하는 흐름.",
    decisionRule: "새 요구와 기존 약속이 맞지 않는 상황에서는 어떤 조건을 유지하고 어떤 범위를 바꿀지 나눠 판단한다.",
  },
  combination: {
    meaning: "서로 연결되는 지지의 관계로 함께 맞출 조건과 결합의 여지를 읽는 근거.",
    mechanism: "육합은 서로 연결되는 지지의 관계다. 함께 진행할 수 있는 여지와 그만큼 서로 맞춰야 할 조건을 같이 살피는 관점으로 적용한다.",
    translation: "연결에서 얻는 도움과 함께 조율할 몫을 살피는 흐름.",
    decisionRule: "함께 진행하는 선택에서는 얻을 도움과 맞춰야 할 조건을 함께 보고, 각자 맡을 범위를 정한다.",
  },
};

// These connect two defined functions. They do not assert a new elemental
// combination, a named configuration, or that a life event will take place.
const PAIR_DECISION: Record<GodGroup, Record<GodGroup, string>> = {
  peer: {
    peer: "함께 결정할 범위와 각자 책임질 몫을 구분한다.",
    output: "각자의 의견을 무엇으로 표현하고 누가 마무리할지 연결한다.",
    asset: "동등하게 참여한다는 기대와 실제 투입하는 시간·비용의 기준을 맞춘다.",
    authority: "내가 정할 수 있는 범위와 이미 합의한 역할·기준을 구분한다.",
    resource: "스스로 결정할 부분과 배움·도움을 받아 보완할 부분을 구분한다.",
  },
  output: {
    peer: "표현할 내용과 함께 만드는 사람들의 참여 범위를 맞춘다.",
    output: "새 표현을 더하는 일과 이미 만든 것을 완성하는 일의 비중을 정한다.",
    asset: "만드는 과정에 드는 자원과 활용할 범위를 함께 살핀다.",
    authority: "자유롭게 표현할 부분과 요구된 형식·완료 기준을 구분한다.",
    resource: "더 배우면 달라질 부분과 이미 익혀서 표현할 수 있는 부분을 구분한다.",
  },
  asset: {
    peer: "함께 쓰는 자원에 대해 투입과 배분의 기준을 맞춘다.",
    output: "쓸 수 있는 시간·비용 안에서 무엇을 만들어 활용할지 정한다.",
    asset: "새로운 자원 활용과 기존 자원 관리의 범위를 구분한다.",
    authority: "맡을 역할에 필요한 시간·비용과 책임의 범위를 함께 판단한다.",
    resource: "학습·준비에 쓰는 자원이 어떤 판단을 보완하는지 살핀다.",
  },
  authority: {
    peer: "이미 맡은 책임과 함께 결정할 범위의 경계를 맞춘다.",
    output: "지켜야 할 기준 안에서 설명하거나 개선할 수 있는 부분을 찾는다.",
    asset: "책임을 수행하는 데 필요한 자원과 감당할 범위를 함께 정한다.",
    authority: "요구받은 기준의 우선순위와 서로 충돌하는 책임을 구분한다.",
    resource: "맡은 역할을 수행할 때 보완할 지식과 도움의 범위를 찾는다.",
  },
  resource: {
    peer: "배우고 정리한 근거와 함께 결정하는 사람들의 의견을 구분한다.",
    output: "준비한 내용을 실제 표현으로 옮길 범위와 더 익힐 부분을 나눈다.",
    asset: "준비·학습을 이어갈 비용과 이미 확보한 기반의 활용을 함께 살핀다.",
    authority: "배운 내용과 지원을 요구되는 역할·기준에 어떻게 적용할지 정한다.",
    resource: "새로운 관점을 더 익힐 부분과 기존 지식을 정리해 쓸 부분을 나눈다.",
  },
};

export function createReportDetailCorpus(version: string): CorpusFragment[] {
  const entries = Object.entries(TEN_GOD_MEANINGS);
  const natalMonth = entries.map(([god, source]): CorpusFragment => ({
    id: `F-NATAL-MONTH-${god}`, status: "approved", version, domains: ["essence"], direction: "neutral", strength: 4,
    conditions: [{ field: "natalMonthTenGod", equals: god }], grounds: ["natal-month-ten-god"],
    mechanism: `원국 월간의 ${god}는 ${source.relation}다. ${source.meaning} 일간 자체의 기질에 더해 원국을 구분하는 별도의 근거로 읽는다.`,
    translation: `기질을 설명할 때 ${source.topic}이라는 관점을 함께 짚는다.`,
    concreteScene: "", sceneAnchors: [],
    guidance: "월간 한 글자를 성격 전체나 실제 직업으로 단정하지 않는다. 일간 비유를 반복하지 말고 이 십신의 기능을 짧게 연결한다. 부모·성장환경·과거 경험을 추측하지 않는다.",
  }));
  const natalAnnual = entries.flatMap(([natalGod, natal]) => entries.map(([annualGod, annual]): CorpusFragment => {
    const decisionRule = PAIR_DECISION[natal.group][annual.group];
    return {
      id: `F-NATAL-MONTH-MAIN-ANNUAL-${natalGod}-${annualGod}`, status: "approved", version, domains: ["career"], direction: "neutral", strength: 4,
      conditions: [{ field: "natalMonthMainTenGod", equals: natalGod }, { field: "annualTenGod", equals: annualGod }],
      grounds: ["natal-month-main-ten-god", "annual-ten-god"],
      mechanism: `월지 본기의 ${natalGod}는 ${natal.relation}로, ${natal.topic}을 읽는 원국의 한 근거다. 올해 천간의 ${annualGod}는 ${annual.relation}로, ${annual.topic}을 살피는 올해의 근거다. 두 시간 범위의 기능을 함께 설명한다.`,
      translation: `원래 구성에서 살피는 ${natal.topic}과 올해 판단할 ${annual.topic}을 연결한다.`,
      concreteScene: "", sceneAnchors: [],
      expansion: {
        mechanismSteps: [`원국의 ${natalGod}: ${natal.meaning}`, `올해의 ${annualGod}: ${annual.meaning}`, `두 기능을 생활의 선택에 적용: ${decisionRule}`],
        sceneVariants: [], decisionRule,
        repetitionGuard: "올해 개요의 십신 정의를 다시 길게 설명하지 않고, 원국과 올해의 두 기준을 함께 적용할 때 달라지는 선택을 풀어낸다.",
      },
      guidance: "이 문장은 완성 예문이 아닌 두 기능의 연결 근거다. 실제 직업·재산·취업 상태는 추측하지 않는다. 월지 본기 하나로 격국·신강약·용신을 정하거나 재생관·상관견관 같은 구조의 성립을 선언하지 않는다. 한 해의 취업·승진·수익 결과를 확정하지 않는다.",
    };
  }));
  const annualRelations: CorpusFragment[] = [
    {
      id: "F-ANNUAL-NATAL-CLASH", status: "approved", version, domains: ["yearly"], direction: "mixed", strength: 4,
      conditions: [{ field: "hasAnnualClash", equals: "true" }], grounds: ["annual-branch-clash"],
      mechanism: "세운 지지와 원국 지지 사이에서 육충이 계산된다. 서로 마주하는 지지의 작용은 기존 배치와 새 요구를 조정하는 관점으로 읽는다. 적용 시점은 올해이며 구체적인 사건이나 길흉은 이 관계만으로 판정하지 않는다.",
      translation: "기존 방식을 그대로 유지할 부분과 올해 조건에 맞게 조정할 부분을 구분하는 해석 근거.",
      concreteScene: "", sceneAnchors: [],
      expansion: { mechanismSteps: ["올해 지지와 원국 지지의 육충 확인", "기존 배치와 올해 요구를 구분", "유지할 조건과 조정할 범위를 판단"], sceneVariants: [], decisionRule: "새 요구와 기존 약속이 맞지 않는 상황에서는 어떤 조건을 유지하고 어떤 범위를 바꿀지 나눠 판단한다.", repetitionGuard: "올해 전체의 조정 기준만 설명하고 특정 월·개인 감정·이별 이야기를 덧붙이지 않는다." },
      guidance: "관계표에서 확인한 세운과 원국의 육충만 설명한다. 충을 사고·손실·이별·이직·이사로 바꾸지 않는다. 어느 궁과 닿았는지만으로 가족이나 연인의 사건을 예언하지 않는다.",
    },
    {
      id: "F-ANNUAL-NATAL-COMBINATION", status: "approved", version, domains: ["yearly"], direction: "mixed", strength: 4,
      conditions: [{ field: "hasAnnualCombination", equals: "true" }], grounds: ["annual-branch-combination"],
      mechanism: "세운 지지와 원국 지지 사이에서 육합이 계산된다. 서로 연결되는 지지의 작용은 기존 조건과 올해 요구를 함께 맞추는 관점으로 읽는다. 적용 시점은 올해이며 합화 여부나 성과는 별도로 판정하지 않는다.",
      translation: "연결할 때 얻는 협력의 여지와 함께 맞춰야 할 조건을 살피는 해석 근거.",
      concreteScene: "", sceneAnchors: [],
      expansion: { mechanismSteps: ["올해 지지와 원국 지지의 육합 확인", "함께 움직일 조건과 각자 유지할 범위를 구분", "연결의 이점과 조율에 드는 몫을 함께 판단"], sceneVariants: [], decisionRule: "함께 진행하는 선택에서는 얻을 도움과 맞춰야 할 조건을 함께 보고, 각자 맡을 범위를 정한다.", repetitionGuard: "올해 전체의 연결 기준만 설명하고 특정 월의 대화·일정 장면을 재사용하지 않는다." },
      guidance: "육합을 무조건 좋은 운이나 연애·결혼·계약 성사로 단정하지 않는다. 합화나 새로운 오행의 성립을 추론하지 않는다. 실제로 누군가 나타났다고 쓰지 않는다.",
    },
  ];
  return [...natalMonth, ...natalAnnual, ...annualRelations];
}
