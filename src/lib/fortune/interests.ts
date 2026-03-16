/**
 * Interest-aware content generation
 *
 * Maps user-selected interests to relevant report sections and
 * generates personalized opening + interest-specific prose additions.
 */

import { INTEREST_OPTIONS } from "./types";

const INTEREST_LABEL_MAP: Record<string, string> = Object.fromEntries(
  INTEREST_OPTIONS.map((o) => [o.value, o.label])
);

export function getInterestLabels(interests: string[]): string[] {
  return interests.map((i) => INTEREST_LABEL_MAP[i] || i);
}

export function buildPersonalizedOpening(name: string, interests?: string[]): string {
  if (!interests || interests.length === 0) {
    return `${name}의 2026년, 어떤 흐름이 기다리고 있는지 하나씩 풀어볼게요.`;
  }

  const labels = getInterestLabels(interests);
  const joined = labels.join("과 ");

  if (labels.length === 1) {
    return `${name}이 특히 궁금해했던 ${joined} 흐름을 중심으로, 올해가 어떻게 흘러가는지 찬찬히 살펴볼게요.`;
  }
  if (labels.length === 2) {
    return `${name}이 특히 궁금해했던 ${joined} 흐름을 중심으로, 2026년이 어떤 그림을 그리고 있는지 풀어볼게요.`;
  }
  return `${name}이 궁금해했던 ${labels.slice(0, -1).join(", ")} 그리고 ${labels[labels.length - 1]}까지, 올해 흐름을 하나씩 짚어볼게요.`;
}

type InterestSection = "career" | "relationship" | "wealth" | "health" | "strategy";

const INTEREST_TO_SECTION: Record<string, InterestSection[]> = {
  job_change: ["career"],
  getting_job: ["career"],
  dating: ["relationship"],
  marriage: ["relationship"],
  money: ["wealth"],
  relationships: ["relationship"],
  health: ["health"],
  self_growth: ["strategy", "career"],
};

export function getEmphasizedSections(interests?: string[]): Set<InterestSection> {
  if (!interests || interests.length === 0) return new Set();
  const sections = new Set<InterestSection>();
  for (const interest of interests) {
    const mapped = INTEREST_TO_SECTION[interest];
    if (mapped) mapped.forEach((s) => sections.add(s));
  }
  return sections;
}

export function hasInterest(interests: string[] | undefined, ...keys: string[]): boolean {
  if (!interests) return false;
  return keys.some((k) => interests.includes(k));
}

export function getCareerInterestProse(interests?: string[]): string[] {
  if (!interests) return [];
  const sentences: string[] = [];

  if (interests.includes("job_change")) {
    sentences.push(
      "이직을 고민하고 있다면, 올해는 움직임보다 타이밍이 중요한 해예요. 괜히 조급해서 움직이면 손해인데, 준비만 제대로 해두면 기회가 알아서 찾아오는 구조거든요"
    );
    sentences.push(
      "이력서를 업데이트하고 포트폴리오를 정리해두는 건 지금 당장 해도 좋아요. 기회는 준비된 사람한테 먼저 눈 맞춤하니까요"
    );
  }

  if (interests.includes("getting_job")) {
    sentences.push(
      "취업을 준비하고 있다면, 올해는 스펙 쌓기보다 실전 경험이 훨씬 먹히는 흐름이에요. 인턴이든 프로젝트든, 일단 해본 경험이 면접에서 진짜 차이를 만들어요"
    );
    sentences.push(
      "혼자 고민하는 시간을 줄이고 사람을 만나는 시간을 늘리면, 생각지도 못한 루트로 기회가 들어올 수 있어요"
    );
  }

  return sentences;
}

export function getRelationshipInterestProse(interests?: string[]): string[] {
  if (!interests) return [];
  const sentences: string[] = [];

  if (interests.includes("dating")) {
    sentences.push(
      "연애 쪽에서 보면, 올해는 억지로 만남을 늘리는 것보다 자연스러운 흐름에서 인연이 들어오는 패턴이에요. 소개팅 열 번보다 취미 모임 한 번이 더 나을 수 있어요"
    );
    sentences.push(
      "이미 관계 중이라면, 감정 표현을 살짝만 더 해도 관계 만족도가 확 올라가는 시기예요. 당연한 건 없다는 걸 가끔 말로 확인해주는 게 포인트"
    );
  }

  if (interests.includes("marriage")) {
    sentences.push(
      "결혼을 생각하고 있다면, 올해는 조건보다 생활 리듬의 합이 더 중요한 해예요. 같이 살아봤을 때 편한 사람이 결국 오래가는 사람이거든요"
    );
    sentences.push(
      "결혼 타이밍은 사주적으로도 나쁘지 않지만, 서두르기보다 자연스럽게 흘러가는 게 더 좋은 결과를 만들어요"
    );
  }

  if (interests.includes("relationships")) {
    sentences.push(
      "인간관계에서는 올해 정리와 확장이 동시에 일어나는 흐름이에요. 에너지를 빼는 관계는 놓아주고, 나를 채워주는 사람에게 더 집중하는 게 맞아요"
    );
    sentences.push(
      "사람 관계에서 스트레스받는 건 보통 기대치 문제인데, 올해는 그 기대치를 현실적으로 조정하면 오히려 관계가 훨씬 편해져요"
    );
  }

  return sentences;
}

export function getWealthInterestProse(interests?: string[]): string[] {
  if (!interests) return [];
  const sentences: string[] = [];

  if (interests.includes("money")) {
    sentences.push(
      "재물 쪽에서 보면, 올해는 한 방 터뜨리기보다 새지 않게 관리하는 사람이 결국 웃는 구조예요. 화려하진 않아도 꾸준히 모이는 흐름이거든요"
    );
    sentences.push(
      "충동 소비만 잡아도 연말에 통장 잔고가 꽤 다를 수 있어요. 3일 룰이라고, 사고 싶은 거 3일만 참아보면 진짜 필요한 건지 알게 돼요"
    );
  }

  return sentences;
}

export function getHealthInterestProse(interests?: string[]): string[] {
  if (!interests) return [];
  const sentences: string[] = [];

  if (interests.includes("health")) {
    sentences.push(
      "건강이 신경 쓰인다고 했는데, 올해는 큰 병보다 만성 피로랑 컨디션 기복을 조심하는 게 핵심이에요. 수면 리듬만 잡아도 체감이 확 달라져요"
    );
    sentences.push(
      "무리한 운동보다 매일 30분 걷기가 올해 체력의 기본 체력을 만들어줘요. 작은 습관이 결국 큰 차이를 만드는 해거든요"
    );
  }

  return sentences;
}

export function getStrategyInterestProse(interests?: string[]): string[] {
  if (!interests) return [];
  const sentences: string[] = [];

  if (interests.includes("self_growth")) {
    sentences.push(
      "자기계발에 관심이 있다면, 올해는 이것저것 벌리기보다 한 가지에 깊이 파는 게 훨씬 효율적이에요. 자격증 3개보다 전문성 하나가 더 큰 무기가 돼요"
    );
    sentences.push(
      "배운 걸 기록하고 공유하는 습관을 만들면, 나중에 그게 포트폴리오가 되고 기회가 되는 구조예요. 올해는 인풋보다 아웃풋에 비중을 두는 게 맞아요"
    );
  }

  return sentences;
}
