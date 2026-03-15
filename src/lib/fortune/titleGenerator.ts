/**
 * Title Generator: produces witty, modern Korean section titles
 * that are insight-driven and directly connected to the content.
 *
 * Titles must:
 *  - be short Korean insight sentences
 *  - engaging, slightly witty
 *  - modern Korean tone
 *  - directly connected to the paragraph meaning
 *
 * Never use generic titles like: 커리어 운, 연애 운, 금전 운
 */

import type { DerivedSignals } from "./deriveSignals";
import type { YearlySignals2026, AreaLevel } from "./yearlyFlow";

type TitlePool = Record<AreaLevel, string[]>;

function pick(pool: string[], seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return pool[Math.abs(h) % pool.length];
}

export function generateHeadline(natal: DerivedSignals, yearly: YearlySignals2026): string {
  const map: Record<string, Record<string, string>> = {
    wood_feeds_fire: {
      strong: "드디어 빛나는 해, 방향만 흔들리지 않으면 된다",
      mid: "보여줄 준비가 되었다면, 올해가 그 무대다",
      weak: "조금씩 태우면서 빛나는 법을 배우는 해",
    },
    fire_amplifies: {
      strong: "뜨겁게 타오르는 해, 태울 것과 지킬 것을 구분하라",
      mid: "열정이 곧 기회가 되는 해, 다만 과열 주의",
      weak: "불꽃은 크지만 체력은 한정된 해, 속도 조절이 핵심",
    },
    fire_produces_earth: {
      strong: "묵직하게 쌓이는 해, 시간이 편이 되어주는 흐름",
      mid: "화려함 대신 단단함을 선택하는 해",
      weak: "따뜻한 에너지가 바닥을 채워주는 회복의 해",
    },
    fire_controls_metal: {
      strong: "단련의 해, 견딘 만큼 날카로워진다",
      mid: "압박이 실력을 만드는 해, 무너지지만 않으면 된다",
      weak: "버티기의 해, 지금은 성장의 밑그림을 그리는 시간",
    },
    water_controls_fire: {
      strong: "안팎의 방향이 다른 해, 내 중심을 잡는 것이 답",
      mid: "혼란 속에서 진짜 원하는 것을 찾는 해",
      weak: "한 가지에 집중하면 길이 보이는 해",
    },
  };

  const group = map[yearly.fireInteraction] || map.fire_produces_earth;
  return group[natal.selfStrength] || group.mid;
}

export function generateOverallTitle(natal: DerivedSignals, yearly: YearlySignals2026): string {
  if (yearly.flowType === "상승") return "파도가 밀려오고 있는 해, 올라탈 준비만 하면 된다";
  if (yearly.flowType === "도전") return "쉬운 해는 아니지만 끝나고 나면 달라져 있을 해";
  if (yearly.flowType === "회복") return "쉬는 것이 가장 생산적인 해";
  return "바뀌는 것이 많은 해, 유연함이 최고의 무기";
}

export function generateWhyTitle(natal: DerivedSignals, yearly: YearlySignals2026): string {
  const titles: Record<string, string> = {
    wood_feeds_fire: "목이 불을 키우듯, 안에 있던 것이 밖으로 드러나는 구조",
    fire_amplifies: "불 위에 불이 겹치는 해, 모든 것이 두 배로 작동한다",
    fire_produces_earth: "뜨거운 에너지가 기반을 다져주는 상생의 구조",
    fire_controls_metal: "쇠를 녹이는 불처럼, 외부 압박이 형태를 만드는 해",
    water_controls_fire: "물과 불이 만나는 해, 조율이 곧 실력이다",
  };
  return titles[yearly.fireInteraction] || "올해의 에너지가 내 사주와 만나는 방식";
}

export function generateCareerTitle(natal: DerivedSignals, yearly: YearlySignals2026): string {
  const pool: TitlePool = {
    very_positive: [
      "일이 몰아치지만 성과도 같이 커지는 해",
      "보여주기만 하면 인정이 따라오는 흐름",
      "준비한 사람에게 무대가 열리는 시즌",
    ],
    positive: [
      "무대 위의 조명이 켜지는 해, 완성도가 승부를 가른다",
      "기회는 오지만 준비된 사람만 잡을 수 있는 해",
      "누적의 힘이 빛을 보기 시작하는 흐름",
    ],
    neutral: [
      "모든 것을 다 하려면 아무것도 못 하는 해",
      "선택과 집중이 유일한 해법인 시즌",
      "방향을 정하면 속도가 붙는 해",
    ],
    cautious: [
      "일이 어렵지만 근육이 붙는 해",
      "지금 버티는 것이 내년의 점프대가 된다",
      "쉬운 길이 없지만 성장은 확실한 해",
    ],
    challenging: [
      "살아남는 것이 이기는 것인 해",
      "체력 관리가 곧 커리어 관리인 시즌",
      "무너지지 않는 것이 가장 큰 성과인 해",
    ],
  };
  return pick(pool[yearly.career.level], natal.dayHangul + "career");
}

export function generateRelationshipTitle(natal: DerivedSignals, yearly: YearlySignals2026): string {
  const pool: TitlePool = {
    very_positive: [
      "마음을 여는 만큼 관계가 깊어지는 해",
      "함께하는 시간이 특별해지는 흐름",
      "관계의 온도가 한 단계 올라가는 시즌",
    ],
    positive: [
      "매력이 자연스럽게 올라오는 해, 있는 그대로가 최고",
      "새로운 인연이 예상치 못한 곳에서 나타나는 흐름",
      "표현하는 만큼 돌아오는 관계의 해",
    ],
    neutral: [
      "마음이 예민해질수록 말이 중요해지는 시기",
      "솔직함이 관계를 살리는 해",
      "덜 지치는 관계를 기준으로 정리하는 시기",
    ],
    cautious: [
      "감정이 뜨거울 때 한 박자 쉬어야 하는 해",
      "말 한마디가 관계의 방향을 바꿀 수 있는 시기",
      "내 스트레스와 상대의 문제를 분리해야 하는 해",
    ],
    challenging: [
      "관계에서 인내가 필요하지만 끝나면 더 단단해지는 해",
      "감정의 파도가 거센 해, 닻을 내려야 할 때를 아는 것이 중요",
      "혼자만의 시간이 관계를 살리는 해",
    ],
  };
  return pick(pool[yearly.relationship.level], natal.dayHangul + "rel");
}

export function generateWealthTitle(natal: DerivedSignals, yearly: YearlySignals2026): string {
  const pool: TitlePool = {
    very_positive: [
      "꾸준히 쌓는 사람이 웃는 해",
      "자산이 조용히 불어나는 흐름",
      "작은 습관이 큰 돈을 만드는 해",
    ],
    positive: [
      "들어오는 돈도 늘지만 나가는 돈도 느는 해",
      "수입 확대와 지출 관리를 동시에 해야 하는 흐름",
      "기회는 있지만 관리가 답인 해",
    ],
    neutral: [
      "크게 벌기보다 돈 관리가 중요한 흐름",
      "절약이 곧 투자가 되는 해",
      "지출 구조를 바꾸면 여유가 보이는 해",
    ],
    cautious: [
      "지갑을 조이면 마음이 편해지는 해",
      "예상 못한 지출에 대비해야 하는 흐름",
      "충동 소비가 가장 큰 적인 해",
    ],
    challenging: [
      "돈보다 마음 관리가 먼저인 해",
      "비상금이 진짜 실력인 시즌",
      "재정 방어전이 필요한 해",
    ],
  };
  return pick(pool[yearly.wealth.level], natal.dayHangul + "wealth");
}

export function generateHealthTitle(natal: DerivedSignals, yearly: YearlySignals2026): string {
  const pool: TitlePool = {
    very_positive: [
      "몸이 따라주는 해, 그래도 과신은 금물",
      "에너지가 넘치는 해, 방향만 잘 쓰면 된다",
    ],
    positive: [
      "컨디션이 안정적인 해, 루틴만 지키면 된다",
      "건강의 기본만 지키면 무난한 해",
    ],
    neutral: [
      "몸보다 먼저 리듬이 흔들릴 수 있는 해",
      "컨디션의 기복이 성과를 좌우하는 흐름",
    ],
    cautious: [
      "몸이 먼저 신호를 보내는 해, 무시하면 안 된다",
      "무너지기 전에 멈추는 기술이 필요한 해",
    ],
    challenging: [
      "체력이 모든 것의 바닥이 되는 해",
      "쉬는 것이 가장 중요한 건강 전략인 해",
    ],
  };
  return pick(pool[yearly.health.level], natal.dayHangul + "health");
}

export function generateCautionTitle(natal: DerivedSignals, yearly: YearlySignals2026): string {
  if (natal.hasClash) return "갑작스러운 변화에 흔들리지 않는 것이 올해의 힘";
  if (natal.hasGongmang) return "기대를 내려놓으면 오히려 괜찮아지는 구간이 있다";
  if (yearly.caution.level === "challenging") return "과열된 판단이 가장 위험한 해, 멈추는 용기가 필요하다";
  return "감정이 뜨거울 때 결정을 미루는 것이 올해의 생존 전략";
}

export function generateOpportunityTitle(natal: DerivedSignals, yearly: YearlySignals2026): string {
  if (yearly.fireInteraction === "wood_feeds_fire") return "보여주는 사람이 기회를 가져가는 해";
  if (yearly.fireInteraction === "fire_amplifies") return "큰 무대가 기다리고 있는 해, 준비만 되어 있다면";
  if (yearly.fireInteraction === "fire_produces_earth") return "조용한 기회가 가장 오래가는 해";
  if (yearly.fireInteraction === "fire_controls_metal") return "역경이 곧 기회가 되는 해, 남들이 못 하는 것을 해내라";
  return "내면을 채우는 것이 진짜 기회인 해";
}

export function generateStrategyTitle(natal: DerivedSignals, yearly: YearlySignals2026): string {
  if (yearly.flowType === "상승") return "올라가는 파도에서 균형을 잡는 법";
  if (yearly.flowType === "도전") return "단련의 해를 현명하게 보내는 전략";
  if (yearly.flowType === "회복") return "느려도 괜찮은 해, 충전이 가장 현명한 선택";
  return "변화를 받아들이면서 중심을 지키는 전략";
}

export function generateMonthlyTitle(): string {
  return "월별로 끊어보면 타이밍이 훨씬 선명해진다";
}
