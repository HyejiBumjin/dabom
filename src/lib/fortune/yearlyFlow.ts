/**
 * 2026 병오년 (丙午年) Yearly Interpretation Logic
 *
 * 병 (丙) = Yang Fire (천간)
 * 오 (午) = Horse = Fire (지지)
 * → Double fire year: extreme visibility, performance pressure, burnout risk
 *
 * Five-element interactions with fire year:
 *   Wood → feeds fire → expression/visibility boost, but depletion risk
 *   Fire → fire + fire → amplification peak, burnout danger
 *   Earth → fire produces earth → nurturing growth, stability
 *   Metal → fire controls metal → pressure/refinement, tempering steel
 *   Water → water controls fire → tension/drain, discipline needed
 */

import type { DerivedSignals } from "./deriveSignals";
import type { FlowType } from "./types";

export type AreaLevel = "very_positive" | "positive" | "neutral" | "cautious" | "challenging";

export interface YearlyAreaSignal {
  level: AreaLevel;
  keywords: string[];
  coreMessage: string;
}

export interface YearlySignals2026 {
  yearlyElement: "fire";
  yearlyGanji: "병오";
  yearlyGanjiHanja: "丙午";

  fireInteraction: FireInteraction;
  flowType: FlowType;
  yearlyTheme: string;

  career: YearlyAreaSignal;
  relationship: YearlyAreaSignal;
  wealth: YearlyAreaSignal;
  health: YearlyAreaSignal;
  caution: YearlyAreaSignal;
  opportunity: YearlyAreaSignal;

  cautionMonths: number[];
  opportunityMonths: number[];
  peakMonth: number;
  restMonth: number;
}

type FireInteraction =
  | "wood_feeds_fire"
  | "fire_amplifies"
  | "fire_produces_earth"
  | "fire_controls_metal"
  | "water_controls_fire";

function getFireInteraction(dominant: string): FireInteraction {
  switch (dominant) {
    case "wood": return "wood_feeds_fire";
    case "fire": return "fire_amplifies";
    case "earth": return "fire_produces_earth";
    case "metal": return "fire_controls_metal";
    case "water": return "water_controls_fire";
    default: return "fire_produces_earth";
  }
}

function pickFlowType(signals: DerivedSignals, interaction: FireInteraction): FlowType {
  if (signals.relationTensionLevel === "high" && interaction === "fire_controls_metal") return "도전";
  if (interaction === "fire_amplifies" && signals.selfStrength === "strong") return "상승";
  if (interaction === "wood_feeds_fire") return "상승";
  if (interaction === "fire_controls_metal") return "도전";
  if (interaction === "water_controls_fire" && signals.selfStrength === "weak") return "회복";
  if (signals.selfStrength === "strong") return "변화";
  return "변화";
}

function deriveYearlyTheme(signals: DerivedSignals, interaction: FireInteraction): string {
  const themes: Record<FireInteraction, Record<string, string>> = {
    wood_feeds_fire: {
      strong: "쌓아온 것이 빛을 보는 해, 다만 불꽃이 자신까지 태우지 않도록",
      mid: "표현력이 열리는 해, 보여주는 법을 배우는 시기",
      weak: "에너지가 밖으로 흘러나가는 해, 충전과 방출의 균형이 관건",
    },
    fire_amplifies: {
      strong: "모든 것이 증폭되는 해, 잘 되면 크게 잘 되고 무너지면 크게 무너진다",
      mid: "열정의 불길이 높아지는 해, 방향만 잡으면 빠르게 달릴 수 있다",
      weak: "뜨거운 에너지가 밀려오는 해, 몸이 따라가지 못할 수 있으니 속도 조절이 핵심",
    },
    fire_produces_earth: {
      strong: "기반이 단단해지는 해, 조용하지만 확실한 성장이 가능하다",
      mid: "불이 흙을 키우듯 서서히 올라가는 해, 꾸준함이 가장 큰 무기",
      weak: "따뜻한 에너지가 바닥을 채워주는 해, 회복과 성장이 동시에 온다",
    },
    fire_controls_metal: {
      strong: "강한 압박이 실력을 깎아 만드는 해, 견디면 날카로워진다",
      mid: "불에 달궈지는 쇠처럼 단련되는 해, 압박을 성장으로 바꿀 수 있다",
      weak: "외부 압력이 크게 느껴지는 해, 무리하지 않는 전략이 생존의 핵심",
    },
    water_controls_fire: {
      strong: "물과 불이 부딪치는 해, 갈등 속에서 방향을 잡는 것이 과제",
      mid: "상반된 에너지를 조율해야 하는 해, 유연함이 최고의 전략",
      weak: "에너지가 분산되기 쉬운 해, 한 가지에 집중하는 것이 답",
    },
  };
  return themes[interaction][signals.selfStrength] || themes[interaction].mid;
}

function deriveCareerSignal(signals: DerivedSignals, interaction: FireInteraction): YearlyAreaSignal {
  const base: Record<FireInteraction, YearlyAreaSignal> = {
    wood_feeds_fire: {
      level: "very_positive",
      keywords: ["가시성 상승", "인정", "표현력"],
      coreMessage: "그동안 쌓아온 실력이 드디어 눈에 보이기 시작하는 해입니다. 발표, 제안, 포트폴리오 등 보여주는 행동이 커리어를 크게 끌어올릴 수 있습니다.",
    },
    fire_amplifies: {
      level: "positive",
      keywords: ["퍼포먼스 극대화", "스포트라이트", "번아웃 주의"],
      coreMessage: "무대 위에 올라선 것처럼 모든 성과가 증폭됩니다. 하지만 조명이 강할수록 그늘도 선명해지니, 완성도 관리가 필수입니다.",
    },
    fire_produces_earth: {
      level: "positive",
      keywords: ["안정적 성장", "기반 확대", "신뢰 축적"],
      coreMessage: "화려하진 않지만 확실한 성장이 이루어지는 해입니다. 묵묵히 쌓아온 신뢰가 새로운 기회를 만들어냅니다.",
    },
    fire_controls_metal: {
      level: "cautious",
      keywords: ["압박 강화", "실력 단련", "인내 필요"],
      coreMessage: "업무 강도가 높아지고 요구 수준이 올라갑니다. 쉽지 않지만 이 시기를 견디면 이전보다 훨씬 단단해진 자신을 발견하게 됩니다.",
    },
    water_controls_fire: {
      level: "neutral",
      keywords: ["방향 재설정", "우선순위 정리", "선택과 집중"],
      coreMessage: "여러 방향에서 에너지가 끌려가기 쉬운 해입니다. 모든 것을 다 하려 하면 아무것도 제대로 못 하니, 핵심 한 가지를 선택하는 것이 커리어의 열쇠입니다.",
    },
  };

  const result = { ...base[interaction] };
  if (signals.selfStrength === "strong" && interaction !== "fire_controls_metal") {
    result.level = result.level === "neutral" ? "positive" : result.level;
  }
  if (signals.selfStrength === "weak" && (interaction === "fire_controls_metal" || interaction === "fire_amplifies")) {
    result.level = "challenging";
    result.keywords.push("체력 관리 필수");
  }
  return result;
}

function deriveRelationshipSignal(signals: DerivedSignals, interaction: FireInteraction): YearlyAreaSignal {
  if (signals.relationTensionLevel === "high") {
    return {
      level: "cautious",
      keywords: ["감정 과열", "소통 전략", "거리 조절"],
      coreMessage: "불의 해에 관계 긴장까지 겹치면서 감정이 쉽게 끓어오를 수 있습니다. 말 한마디가 불씨가 되기 쉬우니 감정이 올라올 때 한 박자 쉬어가는 습관이 관계를 지켜주고, 그만큼 식은 뒤에 나누는 대화가 관계를 더 단단하게 만드는 계기가 됩니다.",
    };
  }

  const map: Record<FireInteraction, YearlyAreaSignal> = {
    wood_feeds_fire: {
      level: "positive",
      keywords: ["매력 상승", "표현력", "새로운 인연"],
      coreMessage: "자신을 드러내는 에너지가 강해지면서 주변 사람들의 관심이 자연스럽게 따라옵니다. 관계를 넓히기 좋은 해이지만, 깊이 없는 만남에 에너지를 뺏기지 않도록 주의가 필요합니다.",
    },
    fire_amplifies: {
      level: "neutral",
      keywords: ["감정 증폭", "열정적 관계", "과열 주의"],
      coreMessage: "감정의 진폭이 커지는 해입니다. 좋을 때는 아주 좋고 안 좋을 때는 극도로 힘들 수 있습니다. 이성적인 소통 방식을 의식적으로 유지하는 것이 관계 안정의 핵심입니다.",
    },
    fire_produces_earth: {
      level: "very_positive",
      keywords: ["관계 안정", "신뢰 깊어짐", "결혼/동거 적기"],
      coreMessage: "기존 관계가 한 단계 더 깊어지기 좋은 해입니다. 불안함보다 편안함을 주는 사람에게 마음이 기울면서, 생활을 함께 하는 결정을 내릴 수 있는 시기입니다.",
    },
    fire_controls_metal: {
      level: "cautious",
      keywords: ["관계 시험", "갈등 가능성", "인내"],
      coreMessage: "외부 압박으로 인한 스트레스가 관계에 그대로 전이되기 쉬운 해입니다. 상대에게 감정을 쏟기 전에 내 스트레스의 근원이 무엇인지 분리해서 보는 연습이 필요합니다.",
    },
    water_controls_fire: {
      level: "neutral",
      keywords: ["감정 정리", "재정립", "솔직한 대화"],
      coreMessage: "관계에서 무엇이 중요한지 다시 정리하게 되는 해입니다. 표면적인 감정보다 진짜 원하는 것을 솔직하게 말하는 연습이 관계의 질을 바꿔놓습니다.",
    },
  };
  return map[interaction];
}

function deriveWealthSignal(signals: DerivedSignals, interaction: FireInteraction): YearlyAreaSignal {
  const map: Record<FireInteraction, YearlyAreaSignal> = {
    wood_feeds_fire: {
      level: "positive",
      keywords: ["수입 확대 가능", "지출 증가 주의", "투자 타이밍"],
      coreMessage: "활동량이 늘면서 수입 기회도 함께 늘어납니다. 하지만 불의 해에는 돈이 들어오는 만큼 빠져나가기도 쉬워서, 수입과 지출을 같은 비중으로 관리하는 것이 핵심입니다.",
    },
    fire_amplifies: {
      level: "cautious",
      keywords: ["변동성 확대", "충동 소비 주의", "리스크 관리"],
      coreMessage: "큰 돈이 움직일 수 있는 해이지만 방향이 양쪽 다 가능합니다. 투자 수익이 클 수도 있고 손실이 클 수도 있어서, 반드시 손실 허용 범위를 먼저 정하고 움직여야 합니다.",
    },
    fire_produces_earth: {
      level: "very_positive",
      keywords: ["자산 축적", "안정적 수입", "저축 적기"],
      coreMessage: "화려한 대박보다 꾸준한 축적에 운이 있는 해입니다. 매달 일정 금액을 자동으로 저축하거나 안정적인 자산에 배분하면, 한 해가 끝날 때 만족스러운 결과를 볼 수 있습니다.",
    },
    fire_controls_metal: {
      level: "cautious",
      keywords: ["예상치 못한 지출", "방어적 재정", "비상금 확보"],
      coreMessage: "예정에 없던 지출이 발생하기 쉬운 해입니다. 수입을 늘리려는 노력보다 지출을 통제하는 기술이 자산을 지켜줍니다. 비상금 최소 3개월치를 확보해 두는 것을 권합니다.",
    },
    water_controls_fire: {
      level: "neutral",
      keywords: ["수입 정체 가능", "절약 모드", "재구조화"],
      coreMessage: "수입이 크게 늘기 어려운 구조이지만, 지출 구조를 재정비하면 실질 여유가 생깁니다. 필요한 소비와 감정적 소비를 철저하게 구분하는 것이 올해 재정의 핵심 전략입니다.",
    },
  };
  const result = { ...map[interaction] };
  if (signals.balancePattern === "extreme") {
    result.keywords.push("극단적 금전 패턴 주의");
  }
  return result;
}

function deriveHealthSignal(signals: DerivedSignals, interaction: FireInteraction): YearlyAreaSignal {
  const fireYearBase: YearlyAreaSignal = {
    level: "cautious",
    keywords: ["심장/혈관 주의", "수면 관리", "과열 방지"],
    coreMessage: "불의 해에는 몸에 열이 쌓이기 쉽습니다. 수면 부족, 음주, 과로가 겹치면 심혈관계에 부담이 갈 수 있으니 의식적으로 몸을 식혀주는 루틴이 필요합니다.",
  };

  if (signals.weakElement === "water" || signals.weakElement === "metal") {
    fireYearBase.level = "challenging";
    fireYearBase.keywords.push("약한 오행 보강 필수");
    fireYearBase.coreMessage += " 수 기운이나 금 기운이 약한 사주에서는 열이 쌓일 때 컨디션 저하가 더 빨리 올 수 있으니, 수분과 규칙적인 휴식을 챙기면 이 부분을 잘 지킬 수 있고, 그만큼 올해 에너지를 오래 유지하기 좋습니다.";
  }
  if (signals.selfStrength === "weak") {
    fireYearBase.level = "challenging";
    fireYearBase.keywords.push("체력 저하 주의");
  }
  if (interaction === "fire_produces_earth") {
    fireYearBase.level = "neutral";
    fireYearBase.coreMessage = "전반적으로 건강 에너지가 안정적인 해이지만, 불의 해 특성상 과로가 누적되면 소화기관 쪽에 부담이 올 수 있습니다. 과식과 야식을 줄이고 규칙적인 식사 리듬을 지키는 것이 컨디션 유지의 핵심입니다.";
  }
  return fireYearBase;
}

function deriveCautionSignal(signals: DerivedSignals, interaction: FireInteraction): YearlyAreaSignal {
  const base: YearlyAreaSignal = {
    level: "cautious",
    keywords: ["과열 방지", "감정적 결정 금지", "체력 선관리"],
    coreMessage: "불의 해에 가장 위험한 것은 과열된 상태에서 내리는 판단입니다. 그럴 때는 하루 이틀 지나서 다시 보는 습관만 들여도 올해를 훨씬 안정적으로 보낼 수 있습니다.",
  };

  if (interaction === "fire_controls_metal") {
    base.level = "challenging";
    base.keywords.push("외부 압박 대응");
    base.coreMessage = "올해는 외부에서 오는 압박이 클 수 있고, 그 압박 속에서 판단이 흐려지기 쉽습니다. 중요한 결정은 하루 이상 시간을 두고 다시 점검하는 습관이 필요하고, 그만큼 이 시기를 잘 견디면 다음 단계로 넘어가는 실력이 쌓입니다.";
  }
  if (signals.hasClash) {
    base.keywords.push("충 주의");
    base.coreMessage += " 사주에 충의 기운이 있어서 갑작스러운 환경 변화나 관계 갈등이 올 수 있지만, 미리 비상 자금과 대안을 생각해 두면 그때도 선택지를 넓게 가질 수 있습니다.";
  }
  if (signals.hasPunishment) {
    base.keywords.push("형/파 주의");
  }
  if (signals.hasGongmang) {
    base.keywords.push("공망 구간 주의");
    base.coreMessage += " 공망의 에너지가 있어서 특정 시기에 기대 대비 결과가 미미하게 느껴질 수 있으니, 그 구간에서는 투입량을 줄이고 충전·준비의 시간으로 쓰는 것이 유리합니다.";
  }
  return base;
}

function deriveOpportunitySignal(signals: DerivedSignals, interaction: FireInteraction): YearlyAreaSignal {
  const map: Record<FireInteraction, YearlyAreaSignal> = {
    wood_feeds_fire: {
      level: "very_positive",
      keywords: ["자기 PR", "발표/제안", "퍼스널 브랜딩"],
      coreMessage: "올해는 자신을 드러내는 행동 하나하나가 기회로 직결됩니다. 포트폴리오 정리, SNS 활동, 네트워킹 이벤트 참석 등 표현의 채널을 넓히면 예상치 못한 기회가 찾아옵니다.",
    },
    fire_amplifies: {
      level: "positive",
      keywords: ["대형 프로젝트", "리더십", "대외 활동"],
      coreMessage: "큰 무대에 설 기회가 오는 해입니다. 규모가 큰 프로젝트나 리더 역할을 맡을 수 있으며, 이때 준비된 모습을 보여주면 커리어 도약의 발판이 됩니다.",
    },
    fire_produces_earth: {
      level: "positive",
      keywords: ["부동산/실물 자산", "장기 계획", "안정적 파트너십"],
      coreMessage: "화려한 기회보다 묵직한 기회가 찾아오는 해입니다. 부동산, 장기 계약, 안정적인 파트너십 등 시간이 지날수록 가치가 올라가는 기회를 잡는 것이 유리합니다.",
    },
    fire_controls_metal: {
      level: "neutral",
      keywords: ["역경 속 성장", "전문성 입증", "위기 대응 능력"],
      coreMessage: "올해의 기회는 편안한 곳에서 오지 않고 어려운 상황을 돌파할 때 나타납니다. 남들이 꺼리는 일을 맡거나, 위기 상황에서 해결 능력을 보여주면 그것이 곧 기회가 됩니다.",
    },
    water_controls_fire: {
      level: "neutral",
      keywords: ["학습/자격", "재충전", "방향 전환"],
      coreMessage: "올해는 새로운 도전보다 내면을 채우는 것이 진짜 기회입니다. 자격증, 교육, 기술 습득 등에 투자하면, 내년 이후 폭발적인 성장의 기반이 됩니다.",
    },
  };
  return map[interaction];
}

function deriveCautionMonths(interaction: FireInteraction, signals: DerivedSignals): number[] {
  if (interaction === "fire_controls_metal") return [3, 6, 9];
  if (interaction === "fire_amplifies") return [6, 9];
  if (signals.hasClash) return [3, 9, 12];
  if (signals.relationTensionLevel === "high") return [3, 8, 9];
  return [3, 9];
}

function deriveOpportunityMonths(interaction: FireInteraction, signals: DerivedSignals): number[] {
  if (interaction === "wood_feeds_fire") return [4, 5, 10, 11];
  if (interaction === "fire_amplifies") return [4, 7, 10];
  if (interaction === "fire_produces_earth") return [2, 5, 8, 11];
  if (interaction === "fire_controls_metal") return [5, 11];
  return [4, 10];
}

export function calculateYearlySignals(signals: DerivedSignals): YearlySignals2026 {
  const interaction = getFireInteraction(signals.dominantElement);
  const flowType = pickFlowType(signals, interaction);

  const cautionMonths = deriveCautionMonths(interaction, signals);
  const opportunityMonths = deriveOpportunityMonths(interaction, signals);
  const peakMonth = opportunityMonths[Math.floor(opportunityMonths.length / 2)] || 10;
  const restMonth = interaction === "fire_controls_metal" ? 7 : 1;

  return {
    yearlyElement: "fire",
    yearlyGanji: "병오",
    yearlyGanjiHanja: "丙午",
    fireInteraction: interaction,
    flowType,
    yearlyTheme: deriveYearlyTheme(signals, interaction),
    career: deriveCareerSignal(signals, interaction),
    relationship: deriveRelationshipSignal(signals, interaction),
    wealth: deriveWealthSignal(signals, interaction),
    health: deriveHealthSignal(signals, interaction),
    caution: deriveCautionSignal(signals, interaction),
    opportunity: deriveOpportunitySignal(signals, interaction),
    cautionMonths,
    opportunityMonths,
    peakMonth,
    restMonth,
  };
}
