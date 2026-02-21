/**
 * Rule-based fortune engine - deterministic from input
 * Hash-style classification into 5 flow types
 */
import type { FlowType, FortuneInput, FortuneResult } from "./types";

const FLOW_TYPES: FlowType[] = ["상승", "변화", "정체", "도전", "회복"];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pickFlow(input: FortuneInput): FlowType {
  const seed = [
    input.birthDate,
    input.birthTime || "모름",
    input.gender || "",
  ].join("|");
  const idx = hash(seed) % FLOW_TYPES.length;
  return FLOW_TYPES[idx];
}

const TEMPLATES: Record<
  FlowType,
  {
    overall: string;
    career: string;
    love: string;
    money: string;
    cautionMonth: string;
    opportunityMonth: string;
  }
> = {
  상승: {
    overall: "2026년은 당신에게 큰 기운이 밀려오는 해입니다. 꿈을 꾸었다면 한 단계씩 실현해 나가기에 좋은 시기예요.",
    career: "직장이나 사업에서 인정받는 흐름이 이어질 수 있어요. 새로운 도전보다는 지금 하는 일을 깊이 있게 다지는 게 유리합니다.",
    love: "안정적인 관계는 더욱 돈독해지고, 새로운 만남은 뜻밖의 곳에서 찾아올 수 있어요.",
    money: "꾸준히 모아온 습관이 빛을 발하는 해입니다. 큰 투자보다는 분산과 안정을 추천해요.",
    cautionMonth: "3월, 9월",
    opportunityMonth: "5월, 11월",
  },
  변화: {
    overall: "2026년은 변화의 해입니다. 환경이 바뀌거나 새로운 선택을 하게 될 수 있어요. 두려워하지 말고 흐름을 받아들이세요.",
    career: "직장 이직, 역할 변경, 또는 새로운 분야 도전 등의 기회가 올 수 있어요.",
    love: "관계의 전환점이 오는 해입니다. 솔직한 대화가 중요한 시기예요.",
    money: "수입 구조가 바뀌거나 새로운 자산 형성 기회가 생길 수 있어요. 신중하게 판단하세요.",
    cautionMonth: "2월, 8월",
    opportunityMonth: "4월, 10월",
  },
  정체: {
    overall: "2026년은 잠시 숨 고르는 해입니다. 크게 움직이기보다는 내면을 가다듬고 준비하는 시간으로 보내세요.",
    career: "당장의 성과보다는 실력을 쌓는 데 집중하면, 이후 큰 발판이 될 거예요.",
    love: "급한 변화보다는 서로를 이해하고 지지하는 관계를 유지하는 게 좋아요.",
    money: "지출을 줄이고 저축을 늘리는 데 집중하면 한 해를 마무리할 때 만족스러울 거예요.",
    cautionMonth: "6월, 12월",
    opportunityMonth: "1월, 7월",
  },
  도전: {
    overall: "2026년은 도전의 해입니다. 어렵게 느껴지는 일도 포기하지 않고 한 걸음씩 나아가면 반드시 성과가 따라올 거예요.",
    career: "새 프로젝트, 발표, 시험 등 도전적인 기회가 많을 수 있어요. 준비를 철저히 하세요.",
    love: "먼저 마음을 열고 다가가는 자세가 관계에 도움이 될 거예요.",
    money: "수입 증대를 위한 노력이 필요해요. 부수입이나 스킬 업에 관심을 가져보세요.",
    cautionMonth: "4월, 10월",
    opportunityMonth: "2월, 8월",
  },
  회복: {
    overall: "2026년은 회복과 재정비의 해입니다. 지난 시간의 피로를 풀고, 몸과 마음을 돌보세요.",
    career: "무리하지 않는 범위에서 일의 질을 높이는 데 집중하면 좋아요.",
    love: "깊은 신뢰와 위로를 주고받는 관계가 더욱 소중해지는 시기입니다.",
    money: "급한 투자나 지출은 피하고, 기존 자산을 잘 관리하는 데 힘쓰세요.",
    cautionMonth: "5월, 11월",
    opportunityMonth: "3월, 9월",
  },
};

export function generateFortune(input: FortuneInput): FortuneResult {
  const flowType = pickFlow(input);
  const t = TEMPLATES[flowType];
  return {
    flowType,
    overall: t.overall,
    career: t.career,
    love: t.love,
    money: t.money,
    cautionMonth: t.cautionMonth,
    opportunityMonth: t.opportunityMonth,
    sections: [
      { title: "전체분위기", content: t.overall },
      { title: "커리어", content: t.career },
      { title: "연애", content: t.love },
      { title: "금전", content: t.money },
      { title: "조심할 달", content: t.cautionMonth },
      { title: "기회가 오는 달", content: t.opportunityMonth },
    ],
  };
}
