/**
 * Interpretation rules: combines natal signals with 2026 yearly signals
 * to produce paragraph-level prose for each section of the fortune report.
 *
 * TONE: honest, slightly direct, realistic, ultimately constructive and positive.
 * Avoid overly optimistic fortune-telling. Acknowledge pressure/stress/challenges
 * when they exist, then guide toward positive use and practical strategy.
 *
 * PARAGRAPH STRUCTURE (per section):
 *  1. Describe the real situation
 *  2. Explain why it happens
 *  3. Mention possible difficulty (without scaring)
 *  4. Show positive potential / opportunity side
 *  5. Provide practical mindset or strategy
 *
 * RULES: Do not scare; no disasters or fatalistic statements; always show
 * opportunity; psychologically supportive. Reader should finish feeling:
 * "I understand my year better, and I know how to approach it."
 *
 * FORMAT: No bullet lists, no numbered lists; at least 5 sentences per section;
 * natural Korean prose, short essay style; avoid generic fortune phrases.
 */

import type { DerivedSignals } from "./deriveSignals";
import { ELEMENT_KOR } from "./deriveSignals";
import type { YearlySignals2026 } from "./yearlyFlow";

function s(text: string): string {
  const t = text.trim();
  if (!t) return "";
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function prose(sentences: string[]): string {
  return sentences.map(s).filter(Boolean).join(" ");
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function monthsKor(months: number[]): string {
  return months.map((m) => `${m}월`).join(", ");
}

export function buildOverallMood(natal: DerivedSignals, yearly: YearlySignals2026, name: string): string {
  const sentences: string[] = [];

  sentences.push(
    `${name}의 2026년은 ${yearly.yearlyTheme}`
  );
  sentences.push(
    `올해의 천간과 지지가 모두 불(丙午)로 이루어져 있어서, 가시성과 성과 압박이 동시에 강해지는 구조입니다`
  );

  if (yearly.fireInteraction === "wood_feeds_fire") {
    sentences.push(
      `${name}의 사주에서 강한 목 기운은 불을 키우는 연료 역할을 하기 때문에, 올해는 자연스럽게 에너지가 밖으로 분출되면서 주변의 관심과 인정을 받기 쉬운 흐름입니다`
    );
    sentences.push(
      `다만 목이 불을 먹이면 목 자체는 소진되기 때문에, 표현과 활동에만 몰두하다가 내면의 에너지가 바닥나는 것을 경계해야 합니다`
    );
  } else if (yearly.fireInteraction === "fire_amplifies") {
    sentences.push(
      `사주 자체에 불 기운이 강한 상태에서 병오년의 불이 겹치기 때문에, 모든 것이 극대화되는 한 해가 됩니다`
    );
    sentences.push(
      `잘 되면 누구보다 크게 성과를 거둘 수 있지만, 과열되면 예상치 못한 곳에서 무너질 수 있어서 속도 조절이 생존 전략입니다`
    );
  } else if (yearly.fireInteraction === "fire_produces_earth") {
    sentences.push(
      `불이 흙을 만들어내듯, 올해의 강한 화 에너지가 ${name}의 토 기운을 안정적으로 키워주는 구조입니다`
    );
    sentences.push(
      `눈에 띄는 드라마틱한 변화보다는 조용하지만 확실한 기반 성장이 올해의 주요 테마가 됩니다`
    );
  } else if (yearly.fireInteraction === "fire_controls_metal") {
    sentences.push(
      `올해의 강한 화 에너지는 ${name}의 금 기운을 녹이는 방향으로 작용하기 때문에, 외부에서 오는 압박과 도전이 체감적으로 크게 느껴질 수 있습니다`
    );
    sentences.push(
      `하지만 쇠를 불에 달궈야 명검이 만들어지듯, 이 압박을 견디고 나면 이전과는 비교할 수 없을 만큼 단단해진 자신을 발견하게 됩니다`
    );
  } else {
    sentences.push(
      `수 기운이 강한 사주에서 병오년의 불과 만나면 서로 제어하려는 에너지가 충돌하면서, 내부적으로 갈등과 조율의 에너지가 크게 올라옵니다`
    );
    sentences.push(
      `올해는 무엇을 선택하고 무엇을 내려놓을지를 결정하는 것 자체가 가장 중요한 운의 행동입니다`
    );
  }

  sentences.push(
    `대운은 현재 ${natal.currentDaewoon} 흐름 위에 놓여 있어서, ${natal.selfStrength === "strong" ? "이미 확보된 실력을 어떻게 운용하느냐" : "부족한 에너지를 어떻게 보충하고 집중하느냐"}가 올해 성과를 좌우합니다`
  );
  sentences.push(
    `결론적으로 올해는 ${yearly.flowType === "상승" ? "올라가는 파도에 올라탄 해이니 방향만 잘 잡으면 됩니다" : yearly.flowType === "도전" ? "단련의 해이니 결과보다 과정에 집중하는 것이 핵심입니다" : yearly.flowType === "회복" ? "회복과 재충전의 해이니 무리하지 않는 것이 가장 좋은 전략입니다" : "변화와 전환의 해이니 유연하게 대응하는 것이 가장 좋은 전략입니다"}`
  );

  return prose(sentences);
}

export function buildWhySection(natal: DerivedSignals, yearly: YearlySignals2026, name: string): string {
  const sentences: string[] = [];

  sentences.push(
    `이런 흐름이 나타나는 이유는 ${name}의 사주 구조와 2026년 병오의 에너지가 만나는 방식에 있습니다`
  );

  const fiveStr = natal.fiveDistribution
    .map(([k, v]) => `${ELEMENT_KOR[k] || k} ${formatNum(v)}`)
    .join(", ");
  sentences.push(
    `${name}의 오행 분포를 보면 ${fiveStr}로 구성되어 있고, 가장 강한 기운은 ${natal.dominantElementKor}, 상대적으로 약한 기운은 ${natal.weakElementKor}입니다`
  );

  sentences.push(
    `일주는 ${natal.dayHangul || "미상"}${natal.dayHanja ? `(${natal.dayHanja})` : ""}이고 격국은 ${natal.geok}으로, ${natal.basePersonalityPattern} 성향의 기질이 기본 바탕에 깔려 있습니다`
  );

  const interactionExplanation: Record<string, string> = {
    wood_feeds_fire: `목 기운이 강한 사주에 병오년의 강한 불이 만나면 목생화(木生火)의 원리로 에너지가 폭발적으로 분출됩니다. 이 상생 관계는 ${name}의 잠재력을 밖으로 끌어내는 역할을 하지만, 동시에 내부 자원이 빠르게 소진될 수 있어서, 표현과 회복의 리듬을 같이 잡는 것이 중요합니다`,
    fire_amplifies: `사주에 이미 화 기운이 강한 상태에서 같은 화의 해를 만나면 비겁(比劫)의 에너지가 극대화됩니다. 자신감과 추진력이 최고조에 이르는 반면, 과신이나 감정 과잉이 나오기 쉬우니, 잘 나갈 때일수록 한 단계만 끌어내리는 습관이 이 에너지를 오래 쓰는 비결입니다`,
    fire_produces_earth: `강한 화 에너지가 토 기운을 가진 사주를 만나면 화생토(火生土)의 원리로 안정적인 성장 에너지가 만들어집니다. 올해의 뜨거운 에너지가 ${name}의 기반을 단단하게 다져주는 좋은 구조입니다`,
    fire_controls_metal: `병오년의 강렬한 화 에너지가 금 기운을 가진 사주를 만나면 화극금(火克金)의 관계가 성립합니다. 외부 환경이 ${name}에게 강한 압박과 변화를 요구하는 형태로 나타나서 적응 과정에서 에너지가 많이 소모되지만, 이 압박을 견디는 만큼 실력이 정리되고 다음 단계로 넘어가는 발판이 됩니다`,
    water_controls_fire: `수 기운이 강한 사주가 병오년의 불을 만나면 수극화(水克火)의 긴장이 생겨납니다. ${name}의 내부 에너지와 올해의 외부 에너지가 서로 다른 방향을 가리키기 때문에, 무엇을 선택하고 무엇을 내려놓을지 결정하는 것이 올해의 핵심인데, 그만큼 한 해가 끝났을 때 방향이 선명해지는 해이기도 합니다`,
  };
  sentences.push(interactionExplanation[yearly.fireInteraction] || "");

  sentences.push(
    `용신은 ${natal.yongshinPrimary}을 기본으로 하고 ${natal.yongshinSecondary}를 보조로 사용하는 구조이기 때문에, 올해는 ${natal.yongshinPrimary} 방향의 활동을 중심축으로 놓고 ${natal.yongshinSecondary}로 결과물을 만들어가는 전략이 사주의 흐름과 가장 잘 맞습니다`
  );

  if (natal.relationTensionLevel === "high") {
    sentences.push(
      `사주 내에 관계 긴장 신호가 강하게 있어서, 올해 불의 에너지와 결합되면 감정이 쉽게 올라오고 말 한마디가 다툼으로 이어질 수 있습니다. 다만 이런 시기일수록 감정이 식은 뒤에 대화하는 습관을 들이면, 오히려 관계가 더 단단해지는 계기로 바꿀 수 있습니다`
    );
  }

  return prose(sentences);
}

export function buildCareerSection(natal: DerivedSignals, yearly: YearlySignals2026, name: string): string {
  const sig = yearly.career;
  const sentences: string[] = [];

  sentences.push(sig.coreMessage);

  if (sig.level === "very_positive" || sig.level === "positive") {
    sentences.push(
      `올해 커리어에서 가장 중요한 것은 준비된 것을 보여주는 실행력입니다`
    );
    sentences.push(
      `이미 갖추고 있는 실력을 포트폴리오, 발표 자료, 프로젝트 성과 등 눈에 보이는 형태로 정리해 두면, 기회가 왔을 때 전환 속도가 완전히 달라집니다`
    );
    sentences.push(
      `${monthsKor(yearly.opportunityMonths)} 전후로 커리어 관련 액션을 집중적으로 배치하면 성과 체감이 극대화될 가능성이 높습니다`
    );
  } else if (sig.level === "cautious" || sig.level === "challenging") {
    sentences.push(
      `올해는 해야 할 일이 갑자기 늘어나거나 요구 수준이 올라가서 피곤함을 느낄 수 있는 시기입니다`
    );
    sentences.push(
      `외부 압박이 강한 만큼, 모든 요구에 응하기보다 핵심 업무에 에너지를 집중하고 나머지는 위임하거나 시기를 나누는 판단이 필요합니다`
    );
    sentences.push(
      `이런 흐름은 보통 실력을 보여줄 기회와 함께 들어오는 경우가 많습니다. ${monthsKor(yearly.cautionMonths)} 전후에는 업무 강도를 의식적으로 줄이고, 이직·전환 같은 큰 결정은 하루 이틀 여유를 두고 다시 보는 것이 좋습니다`
    );
  } else {
    sentences.push(
      `올해 커리어는 선택과 집중이 유일한 해법입니다`
    );
    sentences.push(
      `여러 방향에서 기회처럼 보이는 것이 동시에 올 수 있지만, 모두를 잡으려 하면 어느 것도 제대로 완성하지 못하게 됩니다`
    );
    sentences.push(
      `상반기에 방향을 확정하고 하반기에 실행에 집중하는 리듬이 올해 커리어의 정답에 가장 가깝습니다`
    );
  }

  if (natal.selfStrength === "strong") {
    sentences.push(
      `${name}은 기본적으로 실행력과 추진력이 있는 사주이기 때문에, 올해는 그 힘을 한 곳에 몰아서 쓰는 것이 분산해서 쓰는 것보다 훨씬 큰 성과를 만들어냅니다`
    );
  } else if (natal.selfStrength === "weak") {
    sentences.push(
      `에너지가 많은 해는 아니기 때문에, 업무 사이사이에 회복 시간을 의식적으로 배치하는 것이 장기적으로 더 높은 성과를 가져옵니다`
    );
  }

  sentences.push(
    `올해 ${name}의 커리어 키워드를 한마디로 요약하면 '${sig.keywords.slice(0, 2).join("과 ")}'입니다`
  );

  return prose(sentences);
}

export function buildRelationshipSection(natal: DerivedSignals, yearly: YearlySignals2026, name: string): string {
  const sig = yearly.relationship;
  const sentences: string[] = [];

  sentences.push(sig.coreMessage);

  if (natal.hasClash) {
    sentences.push(
      `사주에 충의 기운이 있어서 관계에서 갑작스러운 변화나 재정의가 올 수 있습니다. 그럴 때 즉각적인 결론보다 며칠 냉각기를 두고 다시 보는 습관이, 관계를 정리하든 더 깊게 가든 모두에게 유리하게 작동합니다`
    );
  }

  if (sig.level === "very_positive" || sig.level === "positive") {
    sentences.push(
      `연애 중이라면 관계의 깊이가 한 단계 올라가는 경험을 할 수 있고, 솔로라면 예상치 못한 방향에서 좋은 인연이 나타날 가능성이 있습니다`
    );
    sentences.push(
      `관계에서 가장 좋은 전략은 자연스럽게 자신을 드러내는 것입니다. 억지로 만들어진 매력보다 일상의 진솔한 모습이 올해는 훨씬 더 큰 힘을 발휘합니다`
    );
  } else if (sig.level === "cautious" || sig.level === "challenging") {
    sentences.push(
      `관계에서 스트레스가 커지는 시기이기 때문에, 상대방에게 완벽을 기대하기보다 서로의 불완전함을 인정하는 태도가 관계를 지켜줍니다`
    );
    sentences.push(
      `특히 피곤하거나 감정이 올라간 상태에서 중요한 대화를 시작하지 않는 것이 올해 관계 관리의 첫 번째 규칙입니다`
    );
  } else {
    sentences.push(
      `관계에서 솔직함이 가장 중요한 해입니다. 돌려 말하기보다 부드럽지만 직접적으로 자신의 마음을 전달하는 것이 오해를 줄이고 관계의 질을 높여줍니다`
    );
  }

  sentences.push(
    `가족이나 오래된 관계에서는 익숙함 때문에 소홀해지기 쉬운데, 올해는 의식적으로 감사와 애정을 표현하는 것이 관계의 온도를 크게 올려줍니다`
  );
  sentences.push(
    `올해 대인관계의 핵심을 요약하면, 덜 지치는 관계를 기준으로 에너지를 배분하는 것입니다`
  );

  return prose(sentences);
}

export function buildWealthSection(natal: DerivedSignals, yearly: YearlySignals2026, name: string): string {
  const sig = yearly.wealth;
  const sentences: string[] = [];

  sentences.push(sig.coreMessage);

  if (sig.level === "very_positive") {
    sentences.push(
      `올해는 자산을 꾸준히 축적하기에 좋은 에너지가 흐르고 있어서, 매달 자동 이체로 저축이나 적립식 투자를 설정해 두면 연말에 만족스러운 결과를 볼 수 있습니다`
    );
  } else if (sig.level === "cautious" || sig.level === "challenging") {
    sentences.push(
      `올해는 수입을 늘리는 것보다 지출을 통제하는 것이 실질적인 자산 증가에 더 큰 영향을 미칩니다`
    );
    sentences.push(
      `특히 감정적으로 불안한 시기에 충동 소비가 늘어나기 쉬우니, 큰 지출은 3일 이상 고민하는 규칙을 만들어 두는 것이 좋습니다`
    );
  }

  if (natal.balancePattern === "extreme") {
    sentences.push(
      `오행의 편중이 크기 때문에 금전 패턴도 극단적으로 흐르기 쉽습니다. 큰돈이 들어왔다 빠지는 흐름이 반복될 수 있어서, 들어온 돈의 최소 30%는 즉시 분리 저축하는 습관이 재정 안정의 열쇠입니다`
    );
  }

  sentences.push(
    `6월 전후로 고정 지출 구조를 한 번 점검하면 하반기 재정 여유가 눈에 띄게 달라질 수 있습니다. 구독 서비스, 보험, 통신비 등 자동으로 빠져나가는 항목을 꼼꼼하게 재검토해 보세요`
  );
  sentences.push(
    `투자에 관해서는 올해는 고수익보다 원금 보전을 우선시하는 전략이 사주의 흐름과 맞습니다. 한 번의 대박보다 꾸준한 수익을 추구하는 방식이 결국 더 큰 자산을 만들어줍니다`
  );
  sentences.push(
    `올해 재정의 핵심 키워드를 한마디로 요약하면 '${sig.keywords[0]}'입니다`
  );

  return prose(sentences);
}

export function buildHealthSection(natal: DerivedSignals, yearly: YearlySignals2026, name: string): string {
  const sig = yearly.health;
  const sentences: string[] = [];

  sentences.push(sig.coreMessage);

  sentences.push(
    `병오년의 강한 화기(火氣)는 몸에 열을 축적시키는 경향이 있어서, 평소보다 충분한 수분 섭취와 규칙적인 수면이 컨디션의 기본 토대가 됩니다`
  );

  if (natal.weakElement === "water") {
    sentences.push(
      `${name}의 사주에서 수 기운이 약한 편이기 때문에, 올해는 열이 쌓일 때 신장·방광 쪽이 먼저 신호를 보낼 수 있습니다. 물을 자주 마시고, 짠 음식을 줄이며, 수면을 확보하면 이 부분을 잘 지킬 수 있어서 컨디션을 안정적으로 유지하기 좋습니다`
    );
  } else if (natal.weakElement === "metal") {
    sentences.push(
      `금 기운이 약한 사주에서 화의 해를 만나면 호흡기나 피부가 평소보다 민감해질 수 있습니다. 환절기 관리와 스트레스 해소만 의식적으로 챙겨도 큰 차이가 나는 해입니다`
    );
  } else if (natal.weakElement === "wood") {
    sentences.push(
      `목 기운이 약한 상태에서 화의 해를 보내면 간담 계통의 피로가 누적되기 쉽습니다. 음주를 줄이고 녹색 채소와 눈 피로 관리를 조금만 신경 쓰면, 올해 에너지를 오래 유지하는 데 도움이 됩니다`
    );
  }

  sentences.push(
    `올해 건강 관리의 핵심은 무너지기 전에 미리 멈추는 것입니다. 컨디션이 떨어지는 느낌이 들면 그날의 일정 밀도를 즉시 줄이고, 수면 시간을 30분 이상 늘려보세요`
  );

  if (natal.selfStrength === "weak") {
    sentences.push(
      `기본 체력이 넉넉하지 않은 사주이기 때문에, 올해는 운동보다 회복에 비중을 두는 것이 맞습니다. 과격한 운동보다 스트레칭이나 가벼운 산책 같은 회복 중심의 활동이 몸의 균형을 잡아줍니다`
    );
  } else {
    sentences.push(
      `체력이 있는 사주이지만 올해는 과신이 가장 큰 적입니다. 괜찮다고 느끼는 순간에도 몸은 이미 피로를 축적하고 있을 수 있으니, 컨디션이 좋을 때 미리 쉬는 습관이 장기 레이스를 완주하게 해줍니다`
    );
  }

  sentences.push(
    `정신 건강 측면에서도 올해는 감정의 진폭이 커지기 쉬운 해이니, 자신만의 스트레스 해소 루틴을 하나쯤 확보해 두는 것을 강력히 권합니다`
  );

  return prose(sentences);
}

export function buildCautionSection(natal: DerivedSignals, yearly: YearlySignals2026, name: string): string {
  const sig = yearly.caution;
  const sentences: string[] = [];

  sentences.push(sig.coreMessage);

  sentences.push(
    `${monthsKor(yearly.cautionMonths)}은 올해 중에서도 특히 에너지 소모가 크고 판단력이 흐려지기 쉬운 구간입니다`
  );
  sentences.push(
    `이 시기에 계약, 이직, 큰 소비, 관계의 중대한 결정 같은 것을 몰아서 처리하면 후회할 가능성이 높아지니, 가능하다면 시기를 분산시키는 것이 좋습니다`
  );

  if (natal.hasClash) {
    sentences.push(
      `사주에 충(沖)의 에너지가 있어서 환경의 급격한 변화가 올 수 있습니다. 미리 대비하기 어려운 변수이기 때문에, 평소에 비상 자금과 대안 계획을 준비해 두는 것이 최선의 방어입니다`
    );
  }
  if (natal.hasGongmang) {
    sentences.push(
      `공망의 기운이 있어서 특정 시기에 노력 대비 결과가 빈약하게 느껴질 수 있습니다. 이 구간에서는 성과를 억지로 만들려 하지 말고, 충전과 준비의 시간으로 활용하는 것이 현명합니다`
    );
  }

  sentences.push(
    `감정이 과열된 상태에서 내린 결정은 나중에 후회로 이어지기 쉽습니다. 그럴 때는 당장 결론 내리지 말고, 하루 이틀 지나서 다시 보는 습관이 올해를 지키는 가장 확실한 방법입니다`
  );
  sentences.push(
    `어려운 구간이 와도 그건 일시적인 에너지 소모일 뿐입니다. 과열 신호를 빨리 알아차리고 속도를 줄이면, 그다음 구간에서 다시 흐름을 잡을 수 있습니다`
  );

  return prose(sentences);
}

export function buildOpportunitySection(natal: DerivedSignals, yearly: YearlySignals2026, name: string): string {
  const sig = yearly.opportunity;
  const sentences: string[] = [];

  sentences.push(sig.coreMessage);

  sentences.push(
    `${monthsKor(yearly.opportunityMonths)}은 올해 중에서도 기회 에너지가 집중되는 구간이니, 이 시기에 맞춰서 중요한 발표, 미팅, 제안, 이동 등을 배치하면 성과 전환율이 올라갑니다`
  );

  if (natal.luckyElement) {
    sentences.push(
      `행운의 오행은 ${natal.luckyElement}이고 방위는 ${natal.luckyDirection} 쪽이니, 중요한 미팅 장소나 작업 환경을 이 방위를 고려해서 세팅하면 심리적 안정과 집중력에 도움이 됩니다`
    );
  }

  sentences.push(
    `기회는 준비된 사람에게만 보이는 법이니, 상반기 동안 성과 기록, 역량 정리, 네트워크 관리를 미리 해 두면 기회가 왔을 때 망설임 없이 잡을 수 있습니다`
  );

  if (yearly.fireInteraction === "wood_feeds_fire" || yearly.fireInteraction === "fire_amplifies") {
    sentences.push(
      `올해는 자신을 적극적으로 드러내는 것이 기회와 직결되는 해입니다. 겸손도 좋지만, 올해만큼은 자신의 성과와 역량을 당당하게 보여주는 것이 훨씬 유리합니다`
    );
  } else {
    sentences.push(
      `올해의 기회는 조용한 곳에서 옵니다. 화려한 무대보다 실력을 쌓는 시간, 사람과의 깊은 대화, 꾸준한 기록이 예상치 못한 전환점을 만들어줍니다`
    );
  }

  sentences.push(
    `행운 숫자는 ${natal.luckyNumbers}이니 참고로 알아두되, 결국 가장 확실한 행운은 매일 조금씩 더 나아지려는 ${name} 자신의 노력입니다`
  );

  return prose(sentences);
}

export function buildStrategySection(natal: DerivedSignals, yearly: YearlySignals2026, name: string): string {
  const sentences: string[] = [];

  sentences.push(
    `올해 ${name}이 가져가야 할 전략의 핵심은 에너지를 분산시키지 않는 것입니다`
  );

  if (yearly.flowType === "상승") {
    sentences.push(
      `상승의 해이니만큼 파도가 밀려오고 있고, 이 파도에 올라타기 위해서는 방향을 명확하게 정하고 거기에 에너지를 집중하는 것이 필수입니다`
    );
    sentences.push(
      `상반기에는 기반을 다지고 방향을 확정하며, 하반기에는 과감하게 실행하는 투 트랙 전략이 올해의 정석입니다`
    );
  } else if (yearly.flowType === "도전") {
    sentences.push(
      `도전의 해에 가장 위험한 것은 무리한 확장입니다. 현재 가진 것을 지키면서 점진적으로 영역을 넓히는 것이 올해의 올바른 전략입니다`
    );
    sentences.push(
      `결과에 조급해하지 마세요. 올해 쌓이는 경험과 내성은 내년, 후년의 성과를 위한 가장 확실한 투자입니다`
    );
  } else if (yearly.flowType === "회복") {
    sentences.push(
      `회복의 해에는 쉬는 것이 가장 생산적인 행동입니다. 억지로 성과를 내려 하기보다 자신의 에너지를 채우고 다음 도약을 준비하는 데 집중하세요`
    );
    sentences.push(
      `올해의 투자는 자기 자신에게 하는 것이 가장 수익률이 높습니다. 건강, 학습, 관계 회복에 시간과 돈을 쓰세요`
    );
  } else {
    sentences.push(
      `변화의 해에는 유연함이 최고의 무기입니다. 계획대로 되지 않는 것에 스트레스 받기보다, 상황에 맞게 빠르게 조정하는 능력이 올해의 성과를 좌우합니다`
    );
    sentences.push(
      `완벽한 계획을 세우기보다 70% 준비된 상태에서 실행하고, 나머지 30%는 움직이면서 채워가는 방식이 올해에 가장 잘 맞습니다`
    );
  }

  sentences.push(
    `용신인 ${natal.yongshinPrimary}의 방향성을 중심축으로 놓고, 보조 용신인 ${natal.yongshinSecondary}로 결과물을 만들어가는 것이 사주의 흐름을 최대한 활용하는 방법입니다`
  );

  sentences.push(
    `매월 첫째 주에 지난달을 간단히 리뷰하고 이번 달 핵심 과제 2~3개를 선정하는 습관을 들이면, 한 해를 마감할 때 이 운세를 다시 읽으며 뿌듯해할 수 있을 것입니다`
  );

  sentences.push(
    `사주는 올해의 흐름을 이해하는 지도이고, 실제로 어떻게 걸어갈지는 ${name}의 선택입니다. 이 리포트를 읽었다면 이미 한 해를 어떻게 대할지 방향을 잡은 셈이에요. 한 번에 하나씩 차분하게 나가면 됩니다`
  );

  return prose(sentences);
}

export interface MonthlyProse {
  month: number;
  prose: string;
}

export function buildMonthlyProse(natal: DerivedSignals, yearly: YearlySignals2026, name: string): MonthlyProse[] {
  const isCaution = (m: number) => yearly.cautionMonths.includes(m);
  const isOpportunity = (m: number) => yearly.opportunityMonths.includes(m);

  const base: Record<number, string[]> = {
    1: [
      "한 해의 시작은 큰 실행보다 기준 정리가 우선입니다",
      "올해의 핵심 목표 2~3개를 선정하고 일정에 반영해 두면 나머지 달이 훨씬 효율적으로 흘러갑니다",
      "수면 패턴과 생활 리듬을 안정시키는 것이 1월의 가장 생산적인 행동입니다",
      "급한 약속이나 제안은 2월 이후로 미루어도 전혀 문제없습니다",
      "새해 첫 달은 조용하지만 확실하게 시작하는 것이 연간 운의 기반을 만듭니다",
    ],
    2: [
      "주변에서 요청과 제안이 늘어나기 시작하는 달입니다",
      "모든 요청에 응하기보다 내 핵심 목표와 맞는 것만 선별적으로 수락하는 것이 에너지 관리의 핵심입니다",
      "업무와 관계에서 작은 리듬이 잡히기 시작하면서, 올해의 방향성이 조금씩 선명해지는 시기입니다",
      "무리하게 속도를 내기보다 자연스러운 흐름에 몸을 맡기는 것이 더 좋은 결과를 만듭니다",
      "2월 말까지 올해의 재정 계획을 간단하게라도 세워두면 하반기 여유가 크게 달라집니다",
    ],
    3: [
      "피로가 슬슬 누적되기 시작하면서 판단력이 흐려지기 쉬운 달입니다",
      "중요한 계약이나 큰 소비 결정은 가능하다면 다음 달로 미루는 것이 안전합니다",
      "감정이 올라올 때 바로 반응하지 말고 하루 정도 시간을 두고 다시 생각해 보는 습관이 이 달을 무사히 넘기는 열쇠입니다",
      "건강 면에서도 무리하지 않도록 일정 밀도를 의식적으로 낮추는 것이 좋습니다",
      "3월은 공격의 달이 아니라 방어의 달이라고 생각하면 정확합니다",
    ],
    4: [
      "커리어와 관련된 움직임이 활발해지는 달입니다",
      "발표, 제안, 이직 면접 등 중요한 액션을 이 시기에 배치하면 반응이 좋을 가능성이 높습니다",
      "단기적인 성과보다 장기적으로 자신의 가치를 높이는 방향으로 결정을 내리는 것이 올해의 큰 흐름과 맞습니다",
      "관계에서도 새로운 만남이 들어올 수 있는 시기이니 열린 마음을 유지하세요",
      "4월의 실행 하나가 하반기 전체의 분위기를 바꿀 수 있으니, 준비된 것이 있다면 과감하게 꺼내보세요",
    ],
    5: [
      "사람 운이 올해 중 가장 좋은 시기 중 하나입니다",
      "먼저 연락하고 먼저 제안하는 쪽이 흐름을 선점하게 되니, 평소 연락하고 싶었던 사람에게 먼저 손을 내밀어 보세요",
      "협업 프로젝트나 팀 활동에서 성과가 나기 좋은 달이라 혼자 하던 일도 다른 사람과 함께 하면 결과가 크게 달라질 수 있습니다",
      "금전적으로도 네트워크를 통한 기회가 들어올 가능성이 있으니, 사람과의 연결을 소홀히 하지 마세요",
      "5월의 에너지를 한마디로 요약하면 연결이 기회가 되는 달입니다",
    ],
    6: [
      "상반기를 마무리하고 재정 점검을 해야 하는 시기입니다",
      "고정 지출, 구독 서비스, 보험 등 자동으로 빠져나가는 항목을 하나하나 점검하면 생각보다 큰 금액을 아낄 수 있습니다",
      "감정적 소비가 늘기 쉬운 달이니, 큰 구매는 3일 룰을 적용해서 충동을 걸러내세요",
      "하반기 전략을 미리 스케치해 두면 7월부터 바로 실행에 들어갈 수 있어서 효율이 크게 올라갑니다",
      "6월은 달리기를 멈추고 장비를 점검하는 피트 스톱 같은 달이라고 생각하세요",
    ],
    7: [
      "리듬 회복과 내실 다지기에 집중하면 하반기 전체가 안정되는 달입니다",
      "무리한 확장보다 지금까지 해온 것의 완성도를 높이는 데 에너지를 쓰는 것이 올해 흐름과 맞습니다",
      "작업 기록, 성과 정리, 포트폴리오 업데이트 같은 정리 작업이 의외로 큰 힘을 발휘하는 시기입니다",
      "건강 면에서는 과격한 운동보다 규칙적인 산책이나 스트레칭이 컨디션을 더 잘 잡아줍니다",
      "7월을 잘 보내면 8월부터 눈에 보이는 차이가 나기 시작합니다",
    ],
    8: [
      "속도보다 정확도가 중요한 달입니다",
      "여러 가지를 동시에 처리하려 하면 실수가 늘어나니, 한 번에 하나씩 집중하는 방식이 훨씬 유리합니다",
      "불필요한 비교와 경쟁의식을 내려놓으면 에너지 누수가 확실히 줄어들고 집중력이 올라갑니다",
      "관계에서는 말수를 줄이되 필요한 말은 정확하게 하는 것이 갈등을 예방합니다",
      "8월의 키워드는 단순화입니다. 복잡한 것을 단순하게 만드는 사람이 이 달의 승자입니다",
    ],
    9: [
      "올해 에너지가 가장 과열되기 쉬운 구간 중 하나입니다",
      "일정 과부하와 감정적 피로가 동시에 올라오기 쉬우니, 휴식 시간을 일정에 먼저 넣고 나머지를 채우는 역발상이 필요합니다",
      "중요한 결정이나 계약은 이 달을 피하고, 10월 이후로 미루는 것이 안전합니다",
      "건강 루틴이 무너지지 않도록 최소한의 수면과 식사 리듬만큼은 반드시 지켜주세요",
      "9월을 잘 넘기면 10월부터 흐름이 확 좋아지니, 조금만 더 참고 버텨주세요",
    ],
    10: [
      "올해 후반부의 하이라이트가 될 수 있는 달입니다",
      "준비해 둔 카드가 있다면 과감하게 실행에 옮기기 좋은 타이밍이고, 발표나 제안의 효과가 극대화되는 시기입니다",
      "사람 운도 같이 올라와서 네트워킹이나 새로운 만남에서 좋은 결과가 나올 가능성이 높습니다",
      "단, 과열에 주의하세요. 잘 되는 느낌에 취해서 무분별하게 확장하면 연말에 수습이 어려워질 수 있습니다",
      "10월은 올해의 피크 포인트이니, 에너지를 집중해서 가장 중요한 한 가지를 반드시 달성하고 넘어가세요",
    ],
    11: [
      "올해 쌓아온 것들이 결과로 보이기 시작하는 회수의 달입니다",
      "성과 정리와 관계 확장을 동시에 가져가면 효율이 극대화됩니다",
      "내년을 위한 핵심 과제를 미리 선별해 두면 12월의 마무리가 훨씬 깔끔해집니다",
      "금전적으로도 올해의 수확을 정리하고 내년 예산을 미리 스케치해 보기 좋은 시기입니다",
      "11월의 에너지를 요약하면, 올해의 수확을 거두고 내년의 씨앗을 뿌리는 달입니다",
    ],
    12: [
      "한 해를 마무리하고 내년을 설계하는 리셋의 달입니다",
      "올해 잘한 것과 아쉬운 것을 분리해서 기록하면, 이 리뷰 하나가 내년의 출발점을 완전히 바꿔놓습니다",
      "관계에서도 감사 인사와 마무리 연락을 정리하면 내년의 대인 관계가 훨씬 부드러워집니다",
      "무리한 연말 일정보다 조용하고 깔끔한 마무리가 운의 이어짐을 탄탄하게 만듭니다",
      "12월을 잘 정리하면 내년 1월이 올해 1월보다 훨씬 선명하게 시작될 수 있습니다",
    ],
  };

  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const lines = base[m];
    const extra: string[] = [];
    if (isCaution(m)) extra.push("이 달은 올해 주의 구간에 해당하니 판단과 체력 관리에 각별히 신경 쓰세요");
    if (isOpportunity(m)) extra.push("이 달은 올해 기회 구간에 해당하니 준비한 것을 적극적으로 실행해 보세요");
    return {
      month: m,
      prose: prose([...lines, ...extra]),
    };
  });
}
