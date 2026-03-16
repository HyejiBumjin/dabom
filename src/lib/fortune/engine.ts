/**
 * Rule-based fortune engine - deterministic from input
 * Hash-style classification into 5 flow types
 */
import type { FlowType, FortuneInput, FortuneResult } from "./types";
import { formatKoreanName } from "./types";
import {
  buildPersonalizedOpening,
  getEmphasizedSections,
  getCareerInterestProse,
  getRelationshipInterestProse,
  getWealthInterestProse,
  getHealthInterestProse,
  getStrategyInterestProse,
} from "./interests";

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
    input.name || "",
    input.calendarType || "solar",
    input.leapMonthType || "regular",
  ].join("|");
  const idx = hash(seed) % FLOW_TYPES.length;
  return FLOW_TYPES[idx];
}

const TEMPLATES: Record<
  FlowType,
  {
    elementalAnalysis: string;
    overall: string;
    career: string;
    love: string;
    money: string;
    cautionMonth: string;
    opportunityMonth: string;
  }
> = {
  상승: {
    elementalAnalysis: "목과 화의 기운이 살아나며 추진력과 표현력이 함께 강해지는 흐름이에요.",
    overall: "2026년은 당신에게 큰 기운이 밀려오는 해입니다. 꿈을 꾸었다면 한 단계씩 실현해 나가기에 좋은 시기예요.",
    career: "직장이나 사업에서 인정받는 흐름이 이어질 수 있어요. 새로운 도전보다는 지금 하는 일을 깊이 있게 다지는 게 유리합니다.",
    love: "안정적인 관계는 더욱 돈독해지고, 새로운 만남은 뜻밖의 곳에서 찾아올 수 있어요.",
    money: "꾸준히 모아온 습관이 빛을 발하는 해입니다. 큰 투자보다는 분산과 안정을 추천해요.",
    cautionMonth: "3월, 9월",
    opportunityMonth: "5월, 11월",
  },
  변화: {
    elementalAnalysis: "수와 목의 순환이 강해지며 이동, 전환, 학습의 테마가 두드러지는 해예요.",
    overall: "2026년은 변화의 해입니다. 환경이 바뀌거나 새로운 선택을 하게 될 수 있어요. 두려워하지 말고 흐름을 받아들이세요.",
    career: "직장 이직, 역할 변경, 또는 새로운 분야 도전 등의 기회가 올 수 있어요.",
    love: "관계의 전환점이 오는 해입니다. 솔직한 대화가 중요한 시기예요.",
    money: "수입 구조가 바뀌거나 새로운 자산 형성 기회가 생길 수 있어요. 신중하게 판단하세요.",
    cautionMonth: "2월, 8월",
    opportunityMonth: "4월, 10월",
  },
  정체: {
    elementalAnalysis: "토 기운이 중심을 잡아주면서 속도를 늦추고 기초를 다질 필요가 커지는 흐름이에요.",
    overall: "2026년은 잠시 숨 고르는 해입니다. 크게 움직이기보다는 내면을 가다듬고 준비하는 시간으로 보내세요.",
    career: "당장의 성과보다는 실력을 쌓는 데 집중하면, 이후 큰 발판이 될 거예요.",
    love: "급한 변화보다는 서로를 이해하고 지지하는 관계를 유지하는 게 좋아요.",
    money: "지출을 줄이고 저축을 늘리는 데 집중하면 한 해를 마무리할 때 만족스러울 거예요.",
    cautionMonth: "6월, 12월",
    opportunityMonth: "1월, 7월",
  },
  도전: {
    elementalAnalysis: "금과 화의 긴장이 커져 결단력은 높아지지만 에너지 분배가 중요한 패턴이에요.",
    overall: "2026년은 도전의 해입니다. 어렵게 느껴지는 일도 포기하지 않고 한 걸음씩 나아가면 반드시 성과가 따라올 거예요.",
    career: "새 프로젝트, 발표, 시험 등 도전적인 기회가 많을 수 있어요. 준비를 철저히 하세요.",
    love: "먼저 마음을 열고 다가가는 자세가 관계에 도움이 될 거예요.",
    money: "수입 증대를 위한 노력이 필요해요. 부수입이나 스킬 업에 관심을 가져보세요.",
    cautionMonth: "4월, 10월",
    opportunityMonth: "2월, 8월",
  },
  회복: {
    elementalAnalysis: "수와 토의 균형을 회복하는 구간이라 안정, 휴식, 재정비의 힘이 크게 작동해요.",
    overall: "2026년은 회복과 재정비의 해입니다. 지난 시간의 피로를 풀고, 몸과 마음을 돌보세요.",
    career: "무리하지 않는 범위에서 일의 질을 높이는 데 집중하면 좋아요.",
    love: "깊은 신뢰와 위로를 주고받는 관계가 더욱 소중해지는 시기입니다.",
    money: "급한 투자나 지출은 피하고, 기존 자산을 잘 관리하는 데 힘쓰세요.",
    cautionMonth: "5월, 11월",
    opportunityMonth: "3월, 9월",
  },
};

function ensurePeriod(sentence: string): string {
  const s = sentence.trim();
  if (!s) return "";
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

function countSentences(text: string): number {
  const matches = text.match(/[^.!?]+[.!?]/g);
  return matches ? matches.length : 0;
}

function joinSentences(sentences: string[]): string {
  return sentences.map(ensurePeriod).filter(Boolean).join(" ");
}

function withMinTenSentences(base: string[], fillers: string[]): string {
  const all = [...base];
  let i = 0;
  while (countSentences(joinSentences(all)) < 10 && i < fillers.length) {
    all.push(fillers[i]);
    i += 1;
  }
  return joinSentences(all);
}

export function generateFortune(input: FortuneInput, interests?: string[]): FortuneResult {
  const flowType = pickFlow(input);
  const t = TEMPLATES[flowType];
  const name = formatKoreanName(input.name || "");
  const emphasized = getEmphasizedSections(interests);
  const personalizedOpening = buildPersonalizedOpening(name, interests);

  const elementalSection = withMinTenSentences([
    `${name}의 기본 기운은 ${t.elementalAnalysis}`,
    "강한 기운만 밀어붙이기보다 부족한 기운을 생활 습관으로 보완하면 운의 균형이 더 좋아져요",
    "아침 루틴과 수면 리듬을 일정하게 맞추면 에너지 기복이 줄어들 수 있어요",
    "사람을 만나는 일정과 혼자 정리하는 시간을 함께 배치하면 집중력이 살아나요",
    "올해는 완벽함보다 꾸준함이 오행 균형을 가장 빠르게 끌어올려 줄 거예요",
  ], [
    "몸 컨디션이 흔들리는 날에는 일정 밀도를 낮추는 게 오히려 성과를 지켜줘요",
    "내가 편안한 공간과 사람을 기준으로 에너지를 채우는 습관이 중요해요",
    "기운이 강한 날에는 실행을, 약한 날에는 정리를 배치하면 효율이 올라가요",
    "균형을 먼저 잡으면 연애, 일, 돈 흐름이 같이 좋아지는 패턴이 나와요",
    "작은 습관의 반복이 올해 운의 체력을 만들어 줄 거예요",
  ]);
  const overallSection = withMinTenSentences([
    personalizedOpening,
    t.overall,
    `${name}에게는 상반기보다 하반기에 성과 체감이 더 크게 들어올 수 있어요`,
    "눈앞의 속도보다 방향성을 우선으로 잡으면 후반 흐름이 안정됩니다",
    "무리하게 일정을 채우기보다 중요한 선택을 선명하게 하는 것이 유리해요",
    "하루를 마감할 때 작은 성취를 기록하면 자신감이 꾸준히 올라갈 거예요",
  ], [
    "상반기에는 기반 정리, 하반기에는 확장 실행이 더 잘 맞아요",
    "욕심을 줄이고 우선순위를 선명하게 잡으면 결과가 빨리 붙어요",
    "내 페이스를 지키면 주변 변수에 흔들리는 폭이 줄어들 수 있어요",
    "좋은 제안은 준비된 상태일 때 더 크게 체감될 가능성이 높아요",
    "결국 올해는 꾸준한 실행이 승부를 가를 거예요",
  ]);
  const careerExtra = emphasized.has("career") ? getCareerInterestProse(interests) : [];
  const careerSection = withMinTenSentences([
    t.career,
    ...careerExtra,
    "업무에서는 지금 잘하는 일 하나를 대표 강점으로 더 선명하게 만드는 전략이 좋아요",
    "협업 상황에서는 결론만 말하기보다 과정까지 공유하면 신뢰를 빨리 얻을 수 있어요",
    "새로운 제안은 단기성과보다 재현 가능한 구조를 기준으로 판단해 보세요",
    "올해의 커리어 키워드는 확장보다 정교화라고 보시면 정확합니다",
  ], [
    "성과를 급하게 내기보다 계속 이기는 구조를 만드는 게 유리해요",
    "내 강점을 숫자와 사례로 보여주면 평가 속도가 빨라질 수 있어요",
    "업무 관계에서는 빈번한 소통보다 정확한 소통이 더 중요해요",
    "이직이나 이동은 타이밍보다 준비도 기준으로 결정하면 안정적이에요",
    "올해 커리어는 한 방보다 누적이 훨씬 강하게 먹힐 거예요",
  ]);
  const relExtra = emphasized.has("relationship") ? getRelationshipInterestProse(interests) : [];
  const loveSection = withMinTenSentences([
    t.love,
    ...relExtra,
    "연애 중이라면 감정 표현의 빈도를 조금만 높여도 관계 만족도가 크게 달라질 수 있어요",
    "새로운 만남을 원한다면 익숙한 생활권 밖에서 인연이 들어올 가능성이 커요",
    "결혼을 고민 중이라면 조건 비교보다 생활 리듬의 합을 먼저 점검해 보세요",
    "상대를 바꾸기보다 대화 방식을 바꾸는 시도가 가장 빠른 개선으로 이어질 거예요",
  ], [
    "관계에서는 사실 전달보다 감정 번역이 갈등을 줄이는 데 더 효과적이에요",
    "말을 아끼는 날보다 따뜻하게 확인해 주는 날에 관계가 크게 좋아져요",
    "연애와 결혼은 맞고 틀림보다 생활 루틴 합이 핵심이에요",
    "불편한 주제일수록 짧게 자주 대화하는 방식이 훨씬 좋아요",
    "올해는 관계에서 조급함을 줄일수록 만족도가 높아질 거예요",
  ]);
  const wealthExtra = emphasized.has("wealth") ? getWealthInterestProse(interests) : [];
  const moneySection = withMinTenSentences([
    t.money,
    ...wealthExtra,
    "지출은 기분 소비와 필요 소비를 나눠서 관리하면 체감 여유가 빨리 늘어납니다",
    "투자는 단기 변동성보다 손실 허용 범위를 먼저 정하고 들어가는 게 안전해요",
    "수입 다변화가 가능하다면 본업을 흔들지 않는 작은 실험부터 시작해 보세요",
    "올해는 크게 벌기보다 새지 않게 지키는 습관이 자산 체력을 만듭니다",
  ], [
    "현금흐름을 먼저 잡으면 불안이 줄고 선택의 질이 올라갈 수 있어요",
    "단기 수익보다 오래 버틸 수 있는 구조가 결국 더 큰 돈이 돼요",
    "비상금과 투자금의 경계를 분리하면 실수 확률이 낮아져요",
    "소비는 후회 없는 지출 중심으로 재구성하면 만족도가 높아집니다",
    "돈의 흐름은 속도보다 지속성이 핵심이라는 점을 기억해 주세요",
  ]);
  const cautionSection = withMinTenSentences([
    `${t.cautionMonth}에는 일정 과부하와 감정적 결정을 특히 조심해 주세요`,
    "무리해서 답을 빨리 내리기보다 하루 정도 텀을 두는 판단이 유리합니다",
    "피로가 누적되면 관계 갈등으로 번지기 쉬우니 휴식 우선순위를 올려야 해요",
    "큰 계약이나 소비는 체크리스트를 만든 뒤 검토하면 실수를 줄일 수 있어요",
    "이 시기에는 공격보다 방어가 전체 운을 지켜주는 핵심 전략입니다",
  ], [
    "특히 수면 부족 상태에서는 중요한 결정을 미루는 게 안전해요",
    "강한 표현보다 정확한 사실 확인이 갈등을 줄이는 데 효과적입니다",
    "계약과 금전은 혼자 결론 내지 말고 한 번 더 검토해 보세요",
    "건강 루틴이 무너지면 전체 운의 체감이 급격히 떨어질 수 있어요",
    "이 구간의 키워드는 확장보다 보수적 운영이에요",
  ]);
  const opportunitySection = withMinTenSentences([
    `${t.opportunityMonth}에는 좋은 제안, 만남, 성과 확장의 기회가 들어올 가능성이 높아요`,
    "준비된 사람에게 기회가 붙기 때문에 포트폴리오와 기록을 미리 정리해 두세요",
    "중요 미팅이나 발표는 이 시기에 배치하면 성과 전환율이 올라갈 수 있어요",
    "관계에서는 먼저 연락을 열어두는 사람이 흐름을 선점하게 됩니다",
    "이 구간의 실행 하나가 내년 출발점까지 바꿀 수 있으니 과감하게 잡아보세요",
  ], [
    "제안이 들어오면 조건만 보지 말고 성장 가능성도 같이 점검해 보세요",
    "빠른 실행보다 정확한 실행이 성과를 더 크게 만들어 줄 수 있어요",
    "사람 기회는 타이밍이 중요하니 먼저 연락하는 쪽이 유리해요",
    "작은 도전 하나가 생각보다 큰 전환점으로 연결될 수 있어요",
    "기회 구간에서는 자신감 있게 시도하는 태도가 핵심이에요",
  ]);
  const monthlySection = [
    "1월",
    "- 계획 정리와 루틴 세팅에 집중하면 출발이 훨씬 안정돼요.",
    "- 중요한 결정보다 기준을 세우는 작업을 먼저 해보세요.",
    "- 수면과 일정 리듬을 맞추면 컨디션 기복이 줄어들 수 있어요.",
    "2월",
    "- 주변 요청이 늘 수 있으니 우선순위를 먼저 나누는 게 좋아요.",
    "- 바로 수락하기보다 내 페이스와 맞는지 확인해 보세요.",
    "- 작은 거절이 장기 성과를 지켜주는 선택이 될 수 있어요.",
    "3월",
    "- 피로 누적이 올라오기 쉬워서 일정 과부하를 특히 조심해야 해요.",
    "- 중요한 계약이나 소비는 하루 텀을 두고 다시 검토해 보세요.",
    "- 이 시기엔 확장보다 실수 방지가 전체 운을 지켜줘요.",
    "4월",
    "- 커리어 변화 신호가 들어오기 쉬운 타이밍이라 준비가 중요해요.",
    "- 제안이 오면 단기 보상보다 성장 가능성을 먼저 보세요.",
    "- 발표나 미팅은 근거를 선명하게 준비하면 반응이 좋아질 수 있어요.",
    "5월",
    "- 사람 운과 협업 운이 올라와서 연결이 성과로 이어지기 쉬워요.",
    "- 먼저 연락하고 먼저 제안하는 쪽이 흐름을 선점하게 돼요.",
    "- 관계에서 열린 태도가 예상 밖 기회를 만들 수 있어요.",
    "6월",
    "- 금전 흐름 점검이 필요한 시기라 고정지출 구조를 정리해 보세요.",
    "- 필요 소비와 감정 소비를 분리하면 체감 여유가 생겨요.",
    "- 손실 허용 범위를 먼저 정해두면 판단이 훨씬 안정됩니다.",
    "7월",
    "- 컨디션 회복과 실력 정리가 성과의 기반이 되는 구간이에요.",
    "- 무리한 확장보다 내실 다지기에 집중하면 후반이 좋아져요.",
    "- 기록과 정리를 습관화하면 자신감이 꾸준히 올라갈 수 있어요.",
    "8월",
    "- 감정소비를 줄이고 선택 기준을 단순하게 만들면 실수를 줄일 수 있어요.",
    "- 속도전보다 정확한 실행이 훨씬 유리한 달이에요.",
    "- 불필요한 비교를 줄이면 에너지 누수가 확실히 줄어들어요.",
    "9월",
    "- 일정 과부하와 감정적 결정이 동시에 올라오기 쉬운 달이에요.",
    "- 건강 루틴이 무너지지 않게 휴식 시간을 먼저 확보해 보세요.",
    "- 이 시기엔 공격보다 방어 중심 운영이 맞아요.",
    "10월",
    "- 발표, 이직, 확장 같은 굵직한 액션이 잘 붙는 타이밍이에요.",
    "- 준비해 둔 카드가 있다면 실행으로 옮기기 좋은 달입니다.",
    "- 사람 기회도 같이 들어오기 쉬워 네트워킹 효과가 커질 수 있어요.",
    "11월",
    "- 결과 회수 구간이라 누적해 둔 노력이 성과로 보이기 쉬워요.",
    "- 협업 정리와 관계 확장을 동시에 가져가면 효율이 좋아요.",
    "- 내년 계획의 핵심 과제를 미리 선별해 두면 유리해요.",
    "12월",
    "- 정산과 회고를 통해 내년 전략을 구체화하기 좋은 시기예요.",
    "- 잘한 점과 아쉬운 점을 분리해 기록하면 다음 해가 쉬워져요.",
    "- 마무리를 깔끔하게 하면 운의 이어짐이 훨씬 탄탄해질 수 있어요.",
  ].join("\n");

  return {
    flowType,
    elementalAnalysis: t.elementalAnalysis,
    overall: t.overall,
    career: t.career,
    love: t.love,
    money: t.money,
    cautionMonth: t.cautionMonth,
    opportunityMonth: t.opportunityMonth,
    sections: [
      { title: "내 사주 간략한 오행 분석", headline: t.elementalAnalysis, content: elementalSection },
      { title: "올해 전체 운", headline: t.overall, content: overallSection },
      { title: "커리어", headline: t.career, content: careerSection },
      { title: "연애&결혼", headline: t.love, content: loveSection },
      { title: "금전", headline: t.money, content: moneySection },
      { title: "조심할 달", headline: t.cautionMonth, content: cautionSection },
      { title: "기회가 오는 달", headline: t.opportunityMonth, content: opportunitySection },
      { title: "1월~12월 월별 운세", headline: "한 해 흐름은 월별로 보면 더 선명해요.", content: monthlySection },
    ],
  };
}
