/**
 * 다봄 자체 작성 주제별 해석 원칙. 완성 예문이나 현대 번역문을 수집하지 않는다.
 * 정의의 출처: 萬民英《三命通會》卷五「論古人立印食官財名義」
 * https://zh.wikisource.org/wiki/三命通會/卷五 — public-domain 한문 원문.
 * 일지를 가까운 관계의 보조 관점으로 읽는 위치 구분: 同書 卷二「論年月日時」
 * https://zh.wikisource.org/wiki/三命通會/卷二 — public-domain 한문 원문.
 * 아래 비용·보상·대화의 구분은 다봄의 현대적 해설이며 고전의 직접 번역이나
 * 사건 예측이 아니다. 성별로 배우자를 배정하거나 일지 하나로 관계를 단정하지 않는다.
 */
import type { CorpusFragment } from "@/lib/saju/interpretation-corpus";
import type { ReportFacts } from "@/lib/saju/report-facts";
import { getTenGodPlainMeaning } from "@/lib/saju/report-terminology";

interface MoneyFacet { question: string; focus: string; choice: string }

const MONEY_FACETS: Record<string, MoneyFacet> = {
  비견: { question: "내 힘으로 하는 일의 값은 어떻게 정할까?", focus: "스스로 하는 일과 자기 몫을 챙기는 기능을 보상에 적용한다.", choice: "혼자 할 수 있다는 이유로 대가를 빼지 않는다. 직접 한 일의 양과 받을 몫을 연결하고, 남의 가격보다 내가 맡는 내용으로 비교한다." },
  겁재: { question: "함께 벌거나 쓸 때 내 몫은 어떻게 남길까?", focus: "동료와 참여·몫을 나누는 기능을 공동 비용과 보상에 적용한다.", choice: "함께 쓰는 돈과 개인이 받는 돈을 구별한다. 참여가 늘면 비용도 보상도 어느 몫인지 정해야 한다. 친밀함만으로 비용을 대신 부담하지 않는다." },
  식신: { question: "익힌 솜씨를 다시 팔거나 쓰는 데 무엇이 필요할까?", focus: "꾸준히 만들어 내는 기능을 반복해서 제공할 결과와 대가에 적용한다.", choice: "한 번 만드는 데 든 시간과 다음에도 드는 시간을 구별한다. 되풀이할수록 준비가 줄어드는 일과 매번 같은 수고가 드는 일의 대가를 다르게 비교한다." },
  상관: { question: "내가 고친 방법에 어떤 대가를 받을 수 있을까?", focus: "다른 방법을 제시하는 기능을 상대가 얻는 이익과 보상에 적용한다.", choice: "새롭다는 이유만으로 가격을 정하지 않는다. 무엇이 더 편해지거나 덜 낭비되는지 설명하고, 고쳐 주는 횟수가 늘면 처음 대가에 포함되는지 구별한다." },
  정재: { question: "받는 돈에서 실제로 남는 몫은 얼마일까?", focus: "정해진 재물을 관리하는 기능을 약속된 대가·반복 비용·실제로 남는 돈으로 구분한다.", choice: "받기로 한 돈만 비교하지 않고 그 일을 위해 계속 내는 비용을 함께 본다. 처음 약속보다 수정·추가 작업이 늘면 같은 대가로 할 일인지 다시 나눈다. 들어올 날짜와 먼저 나갈 돈도 구별한다." },
  편재: { question: "새 수입의 기회에 얼마까지 먼저 써도 될까?", focus: "여러 재물의 기회를 다루는 기능을 먼저 드는 비용과 아직 정해지지 않은 보상에 적용한다.", choice: "가능한 매출과 확정된 수입을 구별한다. 새 제안을 비교할 때 먼저 내야 할 돈과 되돌릴 수 있는 비용을 확인하고, 작은 시도에서 반응을 본 뒤 확대 여부를 정한다." },
  정관: { question: "맡은 역할에 맞는 보상은 어떻게 확인할까?", focus: "정해진 역할과 약속을 일의 대가·인정받는 조건에 적용한다.", choice: "책임이 늘면 기존 대가에 포함되는 일과 새로 정할 일을 구별한다. 열심히 했다는 말만 남기지 않고 무엇을 마치면 얼마를 받는지 같은 뜻으로 정한다." },
  편관: { question: "급한 일을 맡는 수고가 대가에 들어가 있을까?", focus: "긴급한 요구에 대응하는 기능을 시간 압박과 추가 수고의 비용에 적용한다.", choice: "평소 일정의 일과 급히 끼워 넣는 일의 비용을 같게 보지 않는다. 빨리 끝내느라 포기하는 다른 일과 늘어나는 수고까지 비교해 맡을지 정한다." },
  정인: { question: "배우는 데 쓰는 돈은 어디에 쓸 지식으로 남을까?", focus: "배움과 지원을 받는 기능을 학습 비용과 활용할 곳에 적용한다.", choice: "좋은 자료를 사는 일과 지금 필요한 것을 익히는 일을 구별한다. 배운 것을 쓸 일이 있는지 먼저 보고, 지원받을 수 있는 몫과 직접 내야 하는 몫을 나눈다." },
  편인: { question: "새 방법을 배우는 비용을 언제까지 들일까?", focus: "다른 관점과 방법을 찾는 기능을 탐색 비용과 실제 쓰임에 적용한다.", choice: "새 도구와 방법마다 비용을 더하기 전에 같은 일에서 얼마나 도움이 되는지 비교한다. 이미 쓴 돈 때문에 계속 결제하는 일과 앞으로 필요한 지출을 구별한다." },
};

const ANNUAL_MONEY_LINKS: Record<string, string> = {
  비견: "올해 자기 판단이라는 뜻을 더하면, 돈을 쓰거나 대가를 정할 때 내가 고를 몫을 직접 정하는 것이 연결점이다.",
  겁재: "올해 참여와 몫이라는 뜻을 더하면, 함께하는 사람이 생길 때 비용을 내는 몫과 결과를 나누는 몫을 따로 정하는 것이 연결점이다.",
  식신: "올해 만들어 내는 뜻을 더하면, 준비에 쓴 돈이 실제로 내놓을 결과로 이어지는지 보는 것이 연결점이다.",
  상관: "올해 방법을 고치는 뜻을 더하면, 무엇을 얼마나 개선하는지와 그 대가가 함께 달라지는지 보는 것이 연결점이다.",
  정재: "올해 관리하는 재물이라는 뜻을 더하면, 한 번 받을 돈과 계속 나갈 돈을 구별해 남는 몫을 보는 것이 연결점이다.",
  편재: "올해 여러 기회를 다루는 뜻을 더하면, 가능한 보상과 먼저 확정되는 지출을 구별하는 것이 연결점이다.",
  정관: "올해 맡은 역할과 약속이라는 뜻을 더하면, 책임이 늘어나는 경우 일의 내용과 보상도 함께 정하는 것이 연결점이다. 역할의 기준을 살피는 뜻을 승진·소득 증가의 보장으로 바꾸지 않는다.",
  편관: "올해 급한 요구라는 뜻을 더하면, 빠르게 대응하느라 늘어나는 수고를 처음 대가에 포함했는지 보는 것이 연결점이다.",
  정인: "올해 배움과 지원이라는 뜻을 더하면, 직접 지출하기 전에 이용할 수 있는 도움과 배운 것을 쓸 곳을 찾는 것이 연결점이다.",
  편인: "올해 다른 방법을 익히는 뜻을 더하면, 새 방식을 시험하는 비용과 계속 쓸 때의 비용을 나누는 것이 연결점이다.",
};

export function buildFinancialReading(facts: ReportFacts) {
  const cycle = MONEY_FACETS[facts.daYunTenGod];
  const annual = ANNUAL_MONEY_LINKS[facts.annualTenGod];
  if (!cycle || !annual) throw new Error("돈 해석의 십신 근거가 없습니다.");
  return { ...cycle, annual, decision: `${cycle.choice} ${annual}` };
}

const CLOSE_RELATION_CHOICES: Record<string, string> = {
  비견: "가까워도 각자 고를 몫이 있다. 같은 생각을 해야 친한 사이인 것과 서로 다른 선택을 존중하는 사이를 구별한다.",
  겁재: "함께하는 마음과 한쪽이 더 많이 하는 일은 구별한다. 서로 돕는 관계가 되려면 부탁하고 받는 몫을 당연하게 여기지 않는다.",
  식신: "말로 마음을 전하는 것과 직접 챙기는 행동은 다른 방식이다. 상대가 무엇을 편하게 느끼는지 듣고 내가 잘하는 방식과 이어 준다.",
  상관: "생각을 분명히 말하는 기능을 가까운 관계에 적용한다. 불편한 점을 말할 때 상대를 평가하는 말과 내가 바라는 변화를 구별하면 솔직함을 유지하면서 요청이 잘 전해진다.",
  정재: "꾸준히 시간을 내는 행동과 크게 한 번 챙기는 행동을 구별한다. 서로 이어 갈 수 있는 작은 약속이 무엇인지 정한다.",
  편재: "여러 사람과 이어지는 폭과 가까운 한 사람에게 쓰는 시간은 다르다. 새로운 만남이 있다면 기존 관계에 쓸 시간도 함께 살핀다.",
  정관: "약속을 중요하게 여기는 뜻을 관계에 적용한다. 서로 기대하는 연락·만남의 방식이 무엇인지 말해야 내 기대를 상대도 지킬 약속으로 정할 수 있다.",
  편관: "어려울 때 바로 돕는 일과 상대의 모든 문제를 대신 해결하는 일은 다르다. 급한 부탁에는 지금 도울 수 있는 일을 좁혀 전한다.",
  정인: "이야기를 들어 주는 도움과 답을 알려 주는 도움은 다르다. 가까운 사람이 속얘기를 한다면 어떤 도움이 필요한지 먼저 듣는 쪽에 초점을 둔다.",
  편인: "같은 일을 다르게 이해하는 관점을 관계에 적용한다. 짐작으로 숨은 뜻을 정하기보다 서로 어떤 부분을 다르게 받아들였는지 묻는다.",
};

export function buildRelationshipEvidence(facts: ReportFacts, version: string): CorpusFragment {
  const choice = CLOSE_RELATION_CHOICES[facts.natalDayMainTenGod];
  if (!choice) throw new Error("가까운 관계 해석의 십신 근거가 없습니다.");
  return {
    id: `F-CLOSE-RELATION-${facts.natalDayMainTenGod}`, version, status: "approved",
    domains: ["relation"], direction: "mixed", strength: 4, conditions: [],
    grounds: ["natal-day-main-ten-god"],
    mechanism: `원국 일지 본기의 ${facts.natalDayMainTenGod}를 가까운 관계를 이해하는 보조 관점으로 읽는다. ${getTenGodPlainMeaning(facts.natalDayMainTenGod)} 성격 전체·연애 여부·배우자의 성격을 판정하지 않는다.`,
    translation: choice, concreteScene: "", sceneAnchors: [],
    expansion: { mechanismSteps: [getTenGodPlainMeaning(facts.natalDayMainTenGod), choice], sceneVariants: [], decisionRule: choice, repetitionGuard: "관계 도입에서 이 뜻을 한 번만 짚는다. 뒤의 월별 해석을 모두 이 조언으로 끝내지 않는다." },
    guidance: "관계 메시지 도입 1~2문장에 원래 사주의 뜻을 설명한다. 특정 연인·갈등·결혼 사실을 가정하지 않는다. 이후 선정된 월운은 시기별 별도 근거로 연결하되 이 원국 근거를 올해 사건의 원인으로 만들지 않는다.",
  };
}
