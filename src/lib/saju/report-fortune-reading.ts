/**
 * 다봄 자체 작성 해설. 정의 참고: public-domain 한문 원문
 * 萬民英《三命通會》卷五「論古人立印食官財名義」
 * https://zh.wikisource.org/wiki/三命通會/卷五
 * 생극·음양으로 구분한 십신의 뜻을 현대 생활 언어로 연결한다.
 * 고전 번역·완성 예문·사건 예언이 아니며 조합의 성립이나 길흉을 판정하지 않는다.
 */
import { TEN_GOD_MEANINGS } from "@/lib/saju/report-detail-corpus";
import type { ReportFacts } from "@/lib/saju/report-facts";
import { assignTopicTiming, type TopicTiming, type TimingDomain } from "./report-topic-timing";

interface FortuneFacet {
  theme: string;
  opportunity: string;
  tension: string;
  money: string;
  relationship: string;
}

const FACETS = {
  비견: { theme: "스스로 정하는 방향과 다른 사람과 대등하게 서는 자리", opportunity: "남의 답을 따르기보다 자기 판단을 드러내는 일과 연결된다.", tension: "같은 자리에 선 사람들의 생각이 다르면 협력과 경쟁이 가까워진다.", money: "직접 한 일에 돌아오는 몫이 중심이다. 각자의 수입과 함께 쓰는 비용의 차이가 드러난다.", relationship: "가까워도 각자 원하는 것을 가진 관계다. 함께한다는 마음과 같은 선택을 한다는 기대 사이에 차이가 생긴다." },
  겁재: { theme: "사람들과 함께 움직이며 나누는 기회와 몫", opportunity: "혼자 마련할 수 있는 것보다 함께 보탤 수 있는 손과 경험에 뜻이 있다.", tension: "참여하는 사람이 있다는 것은 도움뿐 아니라 나눌 자리와 비용도 있다는 뜻이다.", money: "공동 비용과 각자 받는 대가가 중심이다. 함께하는 규모와 개인에게 남는 돈은 같은 크기로 움직이지 않는다.", relationship: "서로 보태는 마음과 각자 기대하는 몫이 함께 드러나는 관계다. 가까움과 경쟁심이 함께 있는 경우도 이 뜻에 닿는다." },
  식신: { theme: "익힌 솜씨가 눈에 보이는 결과로 이어지는 과정", opportunity: "꾸준히 만들어 내고 보여 주는 힘에 뜻이 있다. 반복할 수 있는 결과가 자기 표현의 바탕이 된다.", tension: "만드는 데 쓰는 시간과 그것을 바깥에 내놓는 속도가 서로 다를 수 있다.", money: "계속 제공할 수 있는 결과와 그 대가가 중심이다. 첫 준비에 드는 비용과 되풀이할 때 드는 수고가 수입의 내용을 가른다.", relationship: "말로 크게 약속하기보다 함께 시간을 보내고 직접 챙기는 행동으로 마음이 전해지는 쪽이다." },
  상관: { theme: "생각을 드러내고 익숙한 방법을 고치는 과정", opportunity: "이미 정해진 답에서 불편한 부분을 찾아 다른 방법으로 설명하는 힘에 뜻이 있다.", tension: "솔직한 표현과 상대가 익숙하게 여긴 방식 사이에 마찰이 생길 여지도 함께 읽힌다.", money: "새로 고친 방법이 주는 값과 그 대가가 중심이다. 개선의 폭이 크더라도 수정에 드는 수고가 늘면 남는 몫은 달라진다.", relationship: "생각이 잘 통할 때는 대화가 생생하지만, 바라는 변화와 상대를 평가하는 말이 가까워질 때에는 온도 차이가 드러난다." },
  정재: { theme: "꾸준히 들어오고 나가는 돈과 생활의 안정", opportunity: "정해진 몫을 이어 가고 눈에 보이는 실속을 쌓는 쪽에 뜻이 있다.", tension: "계속 유지하는 데 드는 시간과 비용이 새로 쓸 수 있는 몫을 줄일 수 있다.", money: "약속된 대가와 반복 지출이 중심이다. 수입의 크기뿐 아니라 일정하게 남는 돈에서 이 흐름의 실속이 드러난다.", relationship: "꾸준히 시간을 내고 작은 약속을 이어 가는 방식에서 마음의 무게가 드러나는 쪽이다." },
  편재: { theme: "바깥으로 넓어지는 연결과 여러 돈의 가능성", opportunity: "서로 다른 사람과 일에서 활용할 수 있는 기회를 찾는 쪽에 뜻이 있다.", tension: "가능성이 여럿이라는 것은 먼저 들일 돈과 시간도 여러 갈래가 된다는 뜻이다.", money: "새로운 수입의 가능성과 먼저 드는 비용이 함께 중심이 된다. 아직 정해지지 않은 대가와 이미 나가는 돈 사이에 시차가 있다.", relationship: "여러 사람을 접하는 폭과 가까운 한 사람에게 들이는 시간이 함께 드러나는 쪽이다." },
  정관: { theme: "맡은 역할이 또렷해지고 그 일에 대한 신뢰를 받는 과정", opportunity: "약속한 일을 해내는 모습과 바깥에서 인정하는 역할이 이어지는 쪽에 뜻이 있다.", tension: "인정받을 자리에는 지켜야 할 약속과 기대도 함께 붙는다. 신뢰와 책임이 같은 주제의 두 면이다.", money: "맡는 역할에 붙는 대가가 중심이다. 책임의 크기와 실제 보상·추가 비용이 얼마나 함께 움직이는지가 돈 이야기와 연결된다.", relationship: "서로 믿고 지킬 약속이 관계의 중심에 놓인다. 마음속 기대와 실제로 함께 정한 약속의 차이도 드러나는 쪽이다." },
  편관: { theme: "빠른 대응과 어려운 요구를 다루는 과정", opportunity: "쉽지 않은 요구 앞에서 결단하고 대응하는 힘에 뜻이 있다.", tension: "대응의 속도가 빨라질수록 감당해야 할 압박과 소모도 가까워진다.", money: "급한 일이나 어려운 일을 맡는 대가가 중심이다. 같은 금액이라도 시간 압박과 추가 수고에 따라 남는 실속이 달라진다.", relationship: "필요할 때 바로 돕는 힘과 상대의 급한 요구를 떠안는 부담이 함께 있는 쪽이다." },
  정인: { theme: "배움과 도움을 받아 자기 바탕을 채우는 과정", opportunity: "이미 쌓인 지식과 다른 사람의 설명이 이해와 준비를 돕는 쪽에 뜻이 있다.", tension: "충분히 배우고 보호받는 편안함과 스스로 답을 내놓아야 하는 순간 사이에 간격이 생긴다.", money: "배움·준비에 드는 비용과 지원받는 몫이 중심이다. 바로 받을 수입보다 앞으로 활용할 지식에 돈을 쓰는 의미가 있다.", relationship: "이야기를 들어 주거나 알고 있는 것을 나누는 도움에서 가까워지는 쪽이다." },
  편인: { theme: "다른 관점에서 답을 찾고 새로운 방법을 익히는 과정", opportunity: "익숙한 설명으로 풀리지 않는 부분을 다른 방식으로 이해하는 쪽에 뜻이 있다.", tension: "새 가능성을 찾는 동안 익숙한 방식의 안정감과 거리가 생길 수 있다.", money: "다른 방법을 시험하는 비용과 실제 쓰임이 중심이다. 새로 배우는 데 들인 돈이 바로 수입으로 돌아오는 것과는 시간 차이가 있다.", relationship: "서로 다른 생각에서 새 관점을 얻는 쪽이다. 같은 말을 서로 다르게 이해하는 거리감도 함께 읽힌다." },
} satisfies Record<string, FortuneFacet>;

type GodGroup = (typeof TEN_GOD_MEANINGS)[string]["group"];
// Ordered pairs describe two functions together. Repetition is thematic emphasis,
// never a strength score, a named configuration, or a guaranteed event.
const BRIDGES: Record<GodGroup, Record<GodGroup, string>> = {
  peer: {
    peer: "자기 판단과 대등한 참여라는 바탕이 올해도 이어진다. 독립성과 협력의 비중이 같은 이야기 안에 놓인다.",
    output: "내 생각을 갖는 바탕에서 그것을 바깥에 표현하는 쪽으로 올해의 초점이 이어진다. 생각과 실제 결과 사이의 간격이 드러난다.",
    asset: "스스로 정하려는 바탕과 돈·시간을 다루는 올해가 만난다. 원하는 방향을 유지하는 데 드는 비용도 함께 의미를 가진다.",
    authority: "내 판단을 지키는 바탕과 바깥에서 기대하는 역할이 만난다. 나답게 하는 일과 남에게 인정받는 일이 맞닿는 동시에 서로 다른 기준을 가질 수 있다.",
    resource: "스스로 답을 정하는 바탕에 배우고 도움받는 올해의 뜻이 이어진다. 독립적으로 하는 힘과 타인의 설명에서 얻는 힘이 함께 놓인다.",
  },
  output: {
    peer: "표현하고 만들어 내는 바탕에 올해 사람들의 참여가 이어진다. 내 결과와 함께한 사람들의 생각이 만나는 쪽으로 읽힌다.",
    output: "만들고 표현하는 바탕이 올해 주제에도 반복된다. 표현할 내용과 그것을 완성해 내놓는 과정에 초점이 모인다.",
    asset: "만들어 내는 바탕에 올해 재물의 뜻이 이어진다. 결과의 쓰임과 거기에 붙는 대가가 가까워지는 이야기다.",
    authority: "자유롭게 표현하는 바탕과 요구받는 역할이 만난다. 설명하는 솜씨가 일을 맡는 데 보탬이 되는 면과 정해진 방식에 걸리는 면이 함께 읽힌다.",
    resource: "이미 표현하는 힘에 올해의 배움이 이어진다. 더 알아가는 내용과 밖으로 내놓을 결과 사이에서 준비와 표현이 함께 뜻을 가진다.",
  },
  asset: {
    peer: "돈과 실속을 다루는 바탕에 올해 사람들의 참여가 이어진다. 쓸 수 있는 몫과 함께 나누는 몫이 같은 이야기 안에 놓인다.",
    output: "시간과 비용을 다루는 바탕에 올해 만들어 내는 뜻이 이어진다. 준비에 들인 것이 실제 결과로 드러나는 과정에 초점이 놓인다.",
    asset: "재물을 다루는 바탕이 올해에도 이어진다. 들어오는 가능성과 유지하는 비용을 함께 가진 돈의 주제가 반복된다.",
    authority: "돈과 시간을 다루는 바탕에 올해 역할의 뜻이 이어진다. 현실적으로 맡을 수 있는 일과 그 일의 대가가 가까이 연결된다.",
    resource: "돈과 시간을 다루는 바탕에 올해 배움의 뜻이 이어진다. 당장의 실속과 준비에 들이는 몫 사이의 시간 차이가 드러난다.",
  },
  authority: {
    peer: "맡은 약속을 지키는 바탕에 올해 자기 판단과 동등한 참여가 이어진다. 정해진 역할과 각자의 의견이 함께 드러나는 이야기다.",
    output: "역할을 지키는 바탕에 올해 표현과 결과의 뜻이 이어진다. 맡은 일을 어떻게 보여 주는지가 중요해지는 쪽으로 읽힌다.",
    asset: "책임을 다루는 바탕에 올해 실속의 뜻이 이어진다. 맡은 일에 필요한 비용과 돌아오는 대가가 같은 이야기 안에 놓인다.",
    authority: "역할과 약속이라는 원래 주제가 올해에도 반복된다. 익숙한 성실함이 바깥의 신뢰와 맞닿는 면과 기대가 부담으로 다가오는 면을 함께 읽는다.",
    resource: "역할을 다루는 바탕에 올해 배움과 도움의 뜻이 이어진다. 혼자 감당하는 책임에 지식과 지원이 보탬이 되는 쪽으로 읽힌다.",
  },
  resource: {
    peer: "배우고 이해하는 바탕에 올해 자기 판단이 이어진다. 알고 있던 내용을 자기 의견으로 꺼내는 쪽에 초점이 놓인다.",
    output: "배움의 바탕에 올해 표현하는 뜻이 이어진다. 받아들인 지식과 바깥에 내놓는 결과가 연결되는 이야기다.",
    asset: "배움과 도움의 바탕에 올해 실속의 뜻이 이어진다. 준비해 둔 것의 실제 쓰임과 그 비용이 함께 드러난다.",
    authority: "배움과 도움의 바탕에 올해 맡는 역할이 이어진다. 익힌 내용이 요구되는 일에 쓰이는 면과 배운 것만으로 답하기 어려운 책임이 함께 읽힌다.",
    resource: "배움과 지원이라는 바탕이 올해 주제에도 반복된다. 이해를 넓히는 편안함과 스스로 답을 내놓는 과제가 함께 놓인다.",
  },
};

export interface FortuneReading {
  grounds: string[];
  basis: Array<{ scope: "natal" | "annual" | "decade"; fact_id: string; meaning: string }>;
  theme: string;
  interplay: string;
  opportunity: string;
  tension: string;
  periods?: Array<{ label: string; grounds: string[]; meaning: string; relation_meanings: string[] }>;
  max_advice_sentences: number;
}

function facet(god: string): FortuneFacet {
  if (!Object.hasOwn(FACETS, god)) throw new Error("운세 설명의 십신 근거가 없습니다.");
  return FACETS[god as keyof typeof FACETS];
}

export function monthlyTopicMeaning(god: string, domain: TimingDomain): string {
  const value = facet(god);
  return domain === "career" ? value.money : domain === "relation" ? value.relationship : `${value.theme}. ${value.opportunity} ${value.tension}`;
}

export function buildFortuneReadings(facts: ReportFacts, timing: TopicTiming = assignTopicTiming(facts)): Record<"yearly" | "relation" | "career" | "mental", FortuneReading> {
  const annual = facet(facts.annualTenGod);
  const pair = (god: string) => BRIDGES[TEN_GOD_MEANINGS[god].group][TEN_GOD_MEANINGS[facts.annualTenGod].group];
  const basis = (scope: "natal" | "annual" | "decade", fact_id: string, god: string) => ({ scope, fact_id, meaning: `${god}: ${facet(god).theme}` });
  const yearlyBasis = [basis("natal", "natal-month-main-ten-god", facts.natalMonthMainTenGod), basis("annual", "annual-ten-god", facts.annualTenGod)];
  const careerBasis = [basis("decade", "da-yun-ten-god", facts.daYunTenGod), basis("annual", "annual-ten-god", facts.annualTenGod)];
  const mentalBasis = [basis("natal", "natal-month-ten-god", facts.natalMonthTenGod), basis("annual", "annual-ten-god", facts.annualTenGod)];
  const close = facet(facts.natalDayMainTenGod);
  const readings: Record<"yearly" | "relation" | "career" | "mental", FortuneReading> = {
    yearly: { grounds: yearlyBasis.map(item => item.fact_id), basis: yearlyBasis, theme: annual.theme, interplay: pair(facts.natalMonthMainTenGod), opportunity: annual.opportunity, tension: annual.tension, max_advice_sentences: 1 },
    career: { grounds: careerBasis.map(item => item.fact_id), basis: careerBasis, theme: facet(facts.daYunTenGod).money, interplay: `${pair(facts.daYunTenGod)} 바탕은 여러 해에 걸친 대운이며 올해와 구분한다. 올해의 돈 해석: ${annual.money}`, opportunity: "두 근거가 가리키는 대가·실속의 성격을 설명한다. 소득이 늘어난다는 예측은 추가하지 않는다.", tension: "같은 두 근거에 담긴 비용·시간·수고 때문에 받는 대가와 남는 돈이 달라지는 면을 설명한다.", max_advice_sentences: 1 },
    mental: { grounds: mentalBasis.map(item => item.fact_id), basis: mentalBasis, theme: "원래 내 방식과 올해의 기대가 맞닿는 지점", interplay: pair(facts.natalMonthTenGod), opportunity: facet(facts.natalMonthTenGod).opportunity, tension: annual.tension, max_advice_sentences: 1 },
    relation: {
      grounds: ["natal-day-main-ten-god"], basis: [basis("natal", "natal-day-main-ten-god", facts.natalDayMainTenGod)],
      theme: close.relationship, interplay: "원래 가까운 관계의 보조 관점을 먼저 짚고, 이어 각 월운의 서로 다른 관계 분위기를 설명한다. 원국의 뜻을 올해 새로 생길 사건으로 바꾸지 않는다.",
      opportunity: "월별로 도움·표현·참여 등 해당 십신의 관계 의미가 어떻게 달라지는지 설명한다.", tension: "해당 기간에 계산된 관계만 연결한다. 관계가 없다는 설명이나 실제 연인·갈등은 만들지 않는다.",
      max_advice_sentences: 1,
    },
  };
  for (const domain of ["yearly", "career", "relation"] as const) {
    readings[domain].periods = timing[domain].map(month => {
      const kinds = [...new Set(month.relations.map(item => item.relation))].filter(kind => kind !== "overlap");
      return { label: month.displayLabel, grounds: [`monthly-${month.ordinal}-ten-god`, ...kinds.map(kind => `monthly-${month.ordinal}-${kind}`)], meaning: monthlyTopicMeaning(month.stemTenGod, domain),
        relation_meanings: kinds.map(kind => kind === "combination" ? "서로 이어지는 부분과 함께 맞출 조건이 드러나는 관계다." : "기존 방식과 달라지는 요구 사이의 차이가 드러나는 관계다.") };
    });
  }
  return readings;
}
