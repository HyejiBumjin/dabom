/**
 * 다봄 자체 작성 조건별 해석. 현대 번역서·서비스의 문장이나 예문을 옮기지 않았다.
 * 정의 확인 출처: 萬民英, 《三命通會》 卷五「論古人立印食官財名義」
 * https://zh.wikisource.org/wiki/三命通會/卷五
 * 해당 고전 한문 원문은 public domain. 생아·아생·극아·아극 및 음양의 구분만
 * 참고했다. 아래의 일·돈·선택에 대한 설명은 다봄이 작성한 현대적 해석이며
 * 고전의 직접 인용, 검증된 사건 예측, 격국 판정으로 표시하지 않는다.
 *
 * 한 십신의 뜻을 모든 주제에 재사용하지 않는다. 같은 명식에서도 세운+월지 본기는
 * 올해의 선택, 세운+대운은 일과 돈의 지속성, 세운+월간은 판단하는 방식을 맡는다.
 * 본기 한 글자·출현 개수로 신강약/용신/길흉을 판정하지 않는다.
 */
import type { CorpusCondition, CorpusFragment } from "@/lib/saju/interpretation-corpus";
import type { ReportFacts } from "@/lib/saju/report-facts";

type GodGroup = "peer" | "output" | "asset" | "authority" | "resource";
type TenGod = "비견" | "겁재" | "식신" | "상관" | "편재" | "정재" | "편관" | "정관" | "편인" | "정인";
type PersonalizedDomain = "yearly" | "career" | "mental";

export interface PersonalizedSectionMetadata {
  question: string;
  distinctFocus: string;
  avoidRepeating: string[];
  primaryTerms: string[];
}

export interface PersonalizedReportEvidence {
  yearly: CorpusFragment[];
  career: CorpusFragment[];
  mental: CorpusFragment[];
  sectionMetadata: Record<PersonalizedDomain, PersonalizedSectionMetadata>;
}

interface GodFacet {
  group: GodGroup;
  /** A function, not a statement that this person has already behaved this way. */
  meaning: string;
  annualQuestion: string;
  sameQuestion: string;
  sameFocus: string;
  sameDecision: string;
  cycleFocus: string;
  cycleQuestion: string;
  cycleDecision: string;
  paceFocus: string;
  paceQuestion: string;
  paceDecision: string;
}

/** Each god keeps its own interpretation instead of collapsing into five groups. */
export const PERSONALIZATION_GOD_FACETS: Record<TenGod, GodFacet> = {
  비견: {
    group: "peer", meaning: "남과 나를 같은 높이에 두고, 내 생각으로 선택하는 힘",
    annualQuestion: "남을 따라 정한 것과 내가 원하는 것을 어떻게 가를까?",
    sameQuestion: "혼자 정할 일과 함께 정할 일을 어떻게 나눌까?",
    sameFocus: "같은 비견을 원국과 올해에서 읽으면 독립적인 판단이 공통 주제다. 힘을 합치는 일에서도 내 결정을 없애지 않는 방법에 집중한다.",
    sameDecision: "같은 목표를 고른 뒤, 함께 합의할 내용과 각자 알아서 할 방법을 나눈다.",
    cycleFocus: "내 이름으로 선택하고 책임지는 일의 바탕을 여러 해에 걸쳐 쌓는 흐름",
    cycleQuestion: "함께 일해도 내 실력으로 남는 것은 무엇일까?",
    cycleDecision: "다른 사람과 함께한 성과 안에서도 내가 해낸 부분을 구분한다. 맡는 일은 그 부분을 더 잘하게 해 주는지 따져 고른다.",
    paceFocus: "다른 사람의 반응을 듣는 일과 내 선택을 바꾸는 일을 구분하기",
    paceQuestion: "남의 의견을 어디까지 듣고 내가 정하면 좋을까?",
    paceDecision: "사실을 바꾸는 의견은 받아들이고 취향이 다른 의견은 참고로 둔다. 모두가 좋아할 답을 찾는 일을 끝내는 기준으로 삼는다.",
  },
  겁재: {
    group: "peer", meaning: "사람들과 힘을 합치며 서로의 몫을 나누는 힘",
    annualQuestion: "같이 하자는 말 속에서 내 몫은 무엇일까?",
    sameQuestion: "사람들과 함께하면서도 공평함을 어떻게 지킬까?",
    sameFocus: "같은 겁재가 원국과 올해의 근거에 놓이면 협력 자체보다 참여와 몫이 맞는지에 집중한다. 친한 정도와 실제로 해낸 양을 같은 잣대로 삼지 않는다.",
    sameDecision: "참여한 시간과 맡은 일을 먼저 본 뒤 나눌 몫을 정한다. 상대가 많이 하는 일과 내가 많이 하는 일을 서로 확인한다.",
    cycleFocus: "여럿이 함께 만드는 일에서 기여와 보상을 구분하는 장기 흐름",
    cycleQuestion: "같이 만든 결과를 어떤 기준으로 나누면 좋을까?",
    cycleDecision: "함께 시작하기 전에 각자 넣는 시간·돈과 받을 몫을 맞춘다. 단지 친하다는 이유로 비용을 대신 떠안는 선택을 따로 구분한다.",
    paceFocus: "다른 사람과 견주는 마음을 내가 원하는 양과 속도로 되돌리기",
    paceQuestion: "남보다 앞서려는 마음과 내가 원하는 것은 어떻게 다를까?",
    paceDecision: "다른 사람이 얻은 양보다 내가 들인 힘과 얻은 것을 비교한다. 비교가 필요하면 출발점과 조건이 같은지도 함께 본다.",
  },
  식신: {
    group: "output", meaning: "익힌 것을 꾸준히 만들고 밖으로 보여 주는 힘",
    annualQuestion: "잘하는 것을 무엇으로 보여 줄까?",
    sameQuestion: "잘하는 것을 어떻게 꾸준히 꺼내 보여 줄까?",
    sameFocus: "원국과 올해의 식신은 만들고 표현하는 기능이 같다. 무엇을 더 배울지보다 이미 할 줄 아는 것을 끝까지 만들어 전달하는 과정에 집중한다.",
    sameDecision: "한 번 만든 뒤 반복해서 쓰거나 다시 만들 수 있는 부분을 찾는다. 새 주제를 더하기 전에 지금 만든 것이 상대에게 잘 전달되는지 본다.",
    cycleFocus: "반복해서 만들 수 있는 기술과 작업을 쌓는 장기 흐름",
    cycleQuestion: "한 번의 좋은 결과를 계속 만들 수 있는 실력으로 어떻게 남길까?",
    cycleDecision: "결과가 좋았던 작업의 순서를 남기고 다음 작업에도 써 본다. 한 번에 만들 수 있는 양보다 꾸준히 해낼 수 있는 양을 기준으로 삼는다.",
    paceFocus: "눈에 보이는 완성 한 번으로 생각을 실제 행동에 이어 붙이기",
    paceQuestion: "머릿속 생각을 어디까지 완성하면 마음이 가벼워질까?",
    paceDecision: "생각을 더 늘리기보다 작게 완성한 것을 한 번 꺼내 놓는다. 반응을 받은 뒤 고칠 부분을 고르면 상상만으로 전부 고치는 일을 줄일 수 있다.",
  },
  상관: {
    group: "output", meaning: "익숙한 방법의 문제를 찾고 내 생각으로 고치는 힘",
    annualQuestion: "무엇을 바꾸면 지금보다 나아질까?",
    sameQuestion: "바꾸고 싶은 점을 어떻게 실제 개선으로 이어 갈까?",
    sameFocus: "원국과 올해의 상관은 낡은 방식에 질문하고 표현하는 기능이 같다. 잘못을 많이 찾는 일보다 바꿨을 때 무엇이 나아지는지 보여 주는 쪽으로 읽는다.",
    sameDecision: "불편한 점 하나에 바꿀 방법 하나를 붙인다. 먼저 작게 바꿔 보고 달라진 점이 분명할 때 다른 부분으로 넓힌다.",
    cycleFocus: "직접 고친 방법과 설명할 수 있는 노하우를 쌓는 장기 흐름",
    cycleQuestion: "내가 바꾼 방법의 가치를 어떻게 보여 줄까?",
    cycleDecision: "바꾸기 전과 후에 걸린 시간이나 줄어든 실수를 비교한다. 의견이 다르다는 사실보다 개선된 부분을 일의 근거로 남긴다.",
    paceFocus: "떠오르는 비판과 지금 말할 제안을 구분하기",
    paceQuestion: "문제가 보여도 모든 것을 바로 고쳐야 할까?",
    paceDecision: "지금 바꿀 수 있는 것 하나를 고르고 대안을 붙여 말한다. 바꿀 수 없는 부분까지 한꺼번에 설득하려는 일은 뒤로 둔다.",
  },
  정재: {
    group: "asset", meaning: "정해진 돈과 시간을 꾸준히 챙기는 힘",
    annualQuestion: "들어오고 나가는 돈과 시간을 어떻게 지킬까?",
    sameQuestion: "크게 늘리기 전에 지금 가진 것을 어떻게 오래 지킬까?",
    sameFocus: "원국과 올해의 정재는 정해진 돈과 시간을 관리하는 기능이 같다. 더 많은 선택을 벌리기보다 계속 감당할 수 있는 크기를 찾는 쪽으로 읽는다.",
    sameDecision: "반드시 들어가는 돈과 시간을 먼저 남겨 놓고 새 선택을 더한다. 한 번 할 수 있는 양과 매달 이어 갈 수 있는 양을 구분한다.",
    cycleFocus: "돈과 시간을 일정하게 쓰고 남기는 바탕을 만드는 장기 흐름",
    cycleQuestion: "이 일을 계속할수록 실제로 무엇이 남을까?",
    cycleDecision: "받을 금액만 보지 않고 준비·수정·이동에 드는 시간과 비용을 함께 계산한다. 겉으로 큰 일보다 같은 힘으로 계속 이어 갈 수 있는 일을 가른다.",
    paceFocus: "알 수 있는 비용과 아직 알 수 없는 결과를 구분하기",
    paceQuestion: "얼마나 알아야 안심하고 선택할 수 있을까?",
    paceDecision: "이미 아는 금액과 시간을 적고 아직 모르는 항목을 따로 둔다. 모르는 것을 모두 손해로 잡지 말고, 더 알아볼 한 가지를 고른다.",
  },
  편재: {
    group: "asset", meaning: "여러 곳의 돈·시간·기회를 찾아 연결하는 힘",
    annualQuestion: "여러 선택지 중 지금 잡을 것은 무엇일까?",
    sameQuestion: "눈에 들어온 기회 중 어디까지 넓힐까?",
    sameFocus: "원국과 올해의 편재는 여러 선택지를 다루는 기능이 같다. 기회를 많이 알아보는 일과 실제로 감당할 수 있는 일을 구분하는 쪽으로 읽는다.",
    sameDecision: "새 선택을 하나 더할 때 이미 쓰고 있는 돈과 시간도 함께 센다. 모든 가능성을 잡기보다 서로 도움 되는 선택을 남긴다.",
    cycleFocus: "여러 일과 사람을 연결하되 쓸 돈과 시간의 한도를 정하는 장기 흐름",
    cycleQuestion: "새 기회를 더해도 지금 하는 일을 이어 갈 수 있을까?",
    cycleDecision: "새 일을 늘리기 전에 서로 나눠 쓸 수 있는 기술과 시간을 찾는다. 연결되는 부분이 없다면 새 비용이 얼마나 생기는지 따로 본다.",
    paceFocus: "가능성이 많다는 것과 모두 선택해야 한다는 생각을 나누기",
    paceQuestion: "좋은 선택지가 여러 개면 무엇부터 고르면 될까?",
    paceDecision: "지금 할 수 있는 선택과 나중에도 가능한 선택을 나눈다. 선택하지 않은 가능성을 곧바로 놓친 손해로 세지 않는다.",
  },
  정관: {
    group: "authority", meaning: "맡은 역할과 정해진 약속을 제대로 지키는 힘",
    annualQuestion: "어떤 일에서 믿고 맡길 만한 사람으로 남을까?",
    sameQuestion: "이미 해낼 줄 아는 일에서 무엇을 더 분명히 보여 줄까?",
    sameFocus: "원국 본기와 올해 천간이 같은 정관이면 지켜야 할 기준이라는 두 근거가 겹친다. 새 책임을 계속 늘리기보다 익숙한 역할 안에서 믿을 만한 부분을 선명하게 만드는 해석이다.",
    sameDecision: "하나의 일에서 약속한 수준을 꾸준히 맞추는 쪽을 고른다. 눈에 띄려고 일을 더 받는 것과 이미 맡은 일의 완성도를 높이는 것을 구분한다.",
    cycleFocus: "맡긴 일을 믿고 다시 부탁할 수 있는 실적을 쌓는 장기 흐름",
    cycleQuestion: "남이 다시 믿고 맡길 수 있게 무엇을 남길까?",
    cycleDecision: "끝낸 일에서 약속과 실제 결과가 맞았는지를 남긴다. 직함을 얻는 기대보다 맡은 일을 다음에도 같은 수준으로 해낼 방법에 집중한다.",
    paceFocus: "일에 대한 평가와 사람 전체에 대한 평가를 나누기",
    paceQuestion: "지적을 받아도 내 전부가 부족하다고 느끼지 않으려면?",
    paceDecision: "피드백이 가리키는 행동이나 결과만 골라 고친다. 일을 고치는 과정과 내 가치를 판단하는 일을 분리한다.",
  },
  편관: {
    group: "authority", meaning: "강한 요구 앞에서 급한 일을 골라 대응하는 힘",
    annualQuestion: "한꺼번에 요구가 오면 무엇부터 처리할까?",
    sameQuestion: "급하다는 요구 중 정말 먼저 해야 할 것은 무엇일까?",
    sameFocus: "원국과 올해의 편관은 강한 요구에 대응하는 기능이 같다. 버티는 힘을 더 내라고 하기보다 요구의 급함과 중요함을 가르는 쪽으로 읽는다.",
    sameDecision: "늦추면 영향이 큰 일과 단지 재촉을 많이 받는 일을 구분한다. 전부를 동시에 해결하려 하지 않고 먼저 처리할 순서를 정한다.",
    cycleFocus: "어려운 일을 풀어내는 능력과 대응 순서를 쌓는 장기 흐름",
    cycleQuestion: "어려운 일을 맡아도 혼자 감당하는 양을 어떻게 정할까?",
    cycleDecision: "내가 해결할 수 있는 문제와 결정 권한이 필요한 문제를 나눈다. 권한이 없는 일은 책임만 받기 전에 결정할 사람을 확인한다.",
    paceFocus: "급한 말투와 실제로 급한 문제를 구분하기",
    paceQuestion: "마음이 급해졌을 때 무엇부터 확인하면 될까?",
    paceDecision: "언제까지 필요한지와 늦어지면 무엇이 달라지는지를 확인한다. 상대의 재촉을 내 모든 일의 우선순위로 바꾸지 않는다.",
  },
  정인: {
    group: "resource", meaning: "배운 내용과 받은 도움을 내 판단의 바탕으로 쓰는 힘",
    annualQuestion: "이미 배운 것과 도움을 어디에 써 볼까?",
    sameQuestion: "더 배우기 전에 이미 아는 것을 어디에 써 볼까?",
    sameFocus: "원국과 올해의 정인은 배움과 지원을 받는 기능이 같다. 자료를 더 모으는 일보다 이미 아는 근거를 실제 판단에 사용하는 쪽으로 읽는다.",
    sameDecision: "지금 필요한 질문 하나를 고르고 배운 내용으로 답해 본다. 답하지 못한 부분만 더 배우거나 도움을 구한다.",
    cycleFocus: "다시 꺼내 쓸 수 있는 지식과 도움받는 방법을 쌓는 장기 흐름",
    cycleQuestion: "배운 것이 실제 일에서 어떤 도움으로 남을까?",
    cycleDecision: "공부한 내용을 실제 질문 하나에 적용한다. 배우는 데 쓴 시간보다 다시 혼자 풀 수 있게 된 문제를 기준으로 본다.",
    paceFocus: "준비를 더해야 할 때와 배운 것을 써도 될 때를 나누기",
    paceQuestion: "준비가 어느 정도면 시작해도 될까?",
    paceDecision: "첫 단계에 꼭 필요한 것만 확인하고 시작한다. 나머지는 해 보다가 막힌 질문이 생길 때 찾아보는 순서로 둔다.",
  },
  편인: {
    group: "resource", meaning: "익숙한 답을 벗어나 내게 맞는 방법을 찾아 익히는 힘",
    annualQuestion: "남의 정답보다 내게 맞는 방법은 무엇일까?",
    sameQuestion: "새 방법을 찾는 데서 끝나지 않으려면 무엇을 확인할까?",
    sameFocus: "원국과 올해의 편인은 다른 관점으로 배우는 기능이 같다. 방법을 계속 바꾸는 일과 내게 맞는 방법을 확인하는 일을 구분하는 쪽으로 읽는다.",
    sameDecision: "바꿔 볼 부분 하나를 골라 같은 일에 적용한다. 좋아진 점을 확인한 뒤 남길 방법을 정하고 그다음 것을 찾는다.",
    cycleFocus: "다르게 보는 관점을 쓸 수 있는 기술로 다듬는 장기 흐름",
    cycleQuestion: "나만의 방법을 다른 일에도 쓸 수 있을까?",
    cycleDecision: "독특한 생각이 실제로 해결하는 문제를 하나 찾는다. 새로운 도구를 계속 늘리기보다 같은 문제에 써 보고 맞는 것을 남긴다.",
    paceFocus: "혼자 생각해서 풀릴 질문과 실제로 확인해야 할 질문을 가르기",
    paceQuestion: "생각을 더 할 때와 한번 확인해 볼 때를 어떻게 가를까?",
    paceDecision: "내가 추측한 것과 직접 확인한 것을 나눈다. 생각만으로 답이 바뀌지 않는 질문은 작은 확인으로 넘어간다.",
  },
};

interface Bridge { focus: string; decision: string }

/** Opposite-polarity functions keep direction even within the same family. */
const SAME_FAMILY_BRIDGES: Record<TenGod, Bridge> = {
  비견: { focus: "사람들과 나누어 움직이는 기능에, 스스로 고르는 올해의 기능이 더해진다.", decision: "같이하기로 정한 일과 내가 혼자 정할 일을 구분한다. 다른 사람의 동의가 꼭 필요한지 살핀 뒤 내 선택을 말한다." },
  겁재: { focus: "내 기준으로 정하는 기능에, 사람들과 몫을 나누는 올해의 기능이 더해진다.", decision: "혼자 정했던 방법을 함께 쓰게 된다면 바꿔야 할 부분을 확인한다. 함께 정할 내용과 각자 맡을 내용을 먼저 나눈다." },
  식신: { focus: "방법을 고치는 기능에, 꾸준히 만들고 완성하는 올해의 기능이 더해진다.", decision: "계속 바꿀 점을 찾기 전에 한 번 끝까지 완성한다. 남겨도 괜찮은 부분은 유지해서 같은 일을 다시 해낼 수 있게 만든다." },
  상관: { focus: "꾸준히 만들어 온 기능에, 익숙한 방법을 바꾸는 올해의 기능이 더해진다.", decision: "잘 이어 가는 순서는 남기고 불편한 부분 하나만 바꾼다. 반복할 수 있다는 장점을 살리며 개선된 점을 확인한다." },
  정재: { focus: "여러 기회를 살피는 기능에, 정해진 돈과 시간을 관리하는 올해의 기능이 더해진다.", decision: "벌여 둔 선택 중 계속 이어 갈 것을 고른다. 새로운 가능성의 수보다 유지하는 데 필요한 양을 먼저 본다." },
  편재: { focus: "정해진 돈과 시간을 챙기는 기능에, 새로운 쓰임을 찾는 올해의 기능이 더해진다.", decision: "꼭 남겨야 할 것을 정한 뒤 작게 넓혀 볼 선택을 찾는다. 익숙한 방식의 안정감과 새 선택의 실제 쓰임을 각각 비교한다." },
  정관: { focus: "강한 요구에 대응하는 기능에, 정해진 약속을 꾸준히 지키는 올해의 기능이 더해진다.", decision: "그때그때 급히 해결하는 일을 줄이도록 반복되는 요청의 기준을 정한다. 한 번 버텨 내는 것보다 다음에도 지킬 수 있는 약속을 고른다." },
  편관: { focus: "정해진 기준을 지키는 기능에, 급한 요구에 대응하는 올해의 기능이 더해진다.", decision: "새로운 요청이 오면 기존 약속의 어떤 부분을 바꿔야 하는지 확인한다. 모든 것을 원래대로 하면서 새 요구까지 더하지 않는다." },
  정인: { focus: "다른 방법을 찾는 기능에, 배운 근거를 바탕으로 삼는 올해의 기능이 더해진다.", decision: "새롭게 떠올린 방법을 이미 확인한 내용과 비교한다. 믿고 반복할 부분을 남겨 다음 판단의 바탕으로 쓴다." },
  편인: { focus: "배운 근거를 활용하는 기능에, 다른 관점을 찾는 올해의 기능이 더해진다.", decision: "배운 답이 잘 맞지 않는 질문 하나를 고른다. 기본을 전부 버리기보다 그 질문에만 다른 방법을 적용해 본다." },
};

/**
 * Distinct cross-family questions, not a verdict that a named 格局 formed.
 * Direction matters: natal output + annual authority is not its reverse.
 */
const YEAR_BRIDGES: Record<GodGroup, Record<GodGroup, Bridge>> = {
  peer: {
    peer: { focus: "내가 정하는 힘과 사람들과 나누는 몫의 차이", decision: "동등한 사이라는 말로 결정을 모두 섞지 않고, 함께 정할 것과 각자 정할 것을 가른다." },
    output: { focus: "내 선택을 말로만 남기지 않고 보이는 형태로 표현하기", decision: "원하는 방향을 하나 정한 뒤 무엇으로 보여 줄지 고른다. 동의를 기다리는 일보다 직접 만들어 설명하는 일을 먼저 둔다." },
    asset: { focus: "스스로 고른 일을 실제 돈과 시간 안에서 이어 가기", decision: "하고 싶은 이유와 감당할 수 있는 크기를 각각 확인한다. 남과 같은 선택을 하기 위해 내 형편까지 맞추지는 않는다." },
    authority: { focus: "내 방식대로 할 부분과 반드시 지켜야 할 약속을 구분하기", decision: "약속한 결과는 맞추되 그 결과에 이르는 방법까지 모두 남에게 맡기지 않는다. 바꿀 수 있는 방법부터 내 선택을 살린다." },
    resource: { focus: "혼자 결정하는 힘에 배운 근거와 다른 사람의 도움을 더하기", decision: "도움을 받는 일을 내 선택을 포기하는 일로 묶지 않는다. 궁금한 부분만 구체적으로 묻고 마지막 선택은 이유와 함께 정한다." },
  },
  output: {
    peer: { focus: "내 표현을 살리면서 함께 만드는 사람의 의견을 받기", decision: "원하는 모양과 함께 정할 부분을 구분한다. 모든 의견을 넣기보다 목표를 더 잘 보여 주는 의견을 고른다." },
    output: { focus: "꾸준히 완성하는 힘과 방법을 바꾸는 힘의 순서", decision: "바꿔 볼 부분과 그대로 이어 갈 부분을 나눈다. 새로운 표현을 더하느라 이미 만든 것을 끝내지 못하는 일을 줄인다." },
    asset: { focus: "만든 것의 쓰임과 들인 돈·시간을 함께 살피기", decision: "무엇을 만들지 정할 때 누가 어디에 쓸지도 함께 정한다. 공을 많이 들였다는 이유만으로 쓸모와 보상이 따라온다고 여기지 않는다." },
    authority: { focus: "표현하고 싶은 방식과 상대가 필요로 하는 결과를 맞추기", decision: "반드시 맞춰야 할 결과를 먼저 확인하고 표현할 방법을 고른다. 형식에 대한 다른 의견은 목표를 더 잘 이루는 이유와 함께 설명한다." },
    resource: { focus: "직접 만들어 본 경험에서 다음에 배울 질문 찾기", decision: "아직 만들지 않은 모든 것을 미리 배우지 않는다. 해 보다가 막힌 한 부분을 배워 다시 적용하는 순서로 잇는다." },
  },
  asset: {
    peer: { focus: "관리하는 돈과 시간을 다른 사람과 나눌 때의 원칙", decision: "각자가 쓸 수 있는 양과 실제로 내는 양을 먼저 확인한다. 친밀함과 공동 비용을 한 가지 기준으로 계산하지 않는다." },
    output: { focus: "쓰고 남기는 데서 한 걸음 더 나아가 직접 가치를 만들기", decision: "비용을 줄이는 선택과 만들어서 도움을 주는 선택을 함께 본다. 아끼는 데만 집중해서 필요한 작업까지 멈추지 않는다." },
    asset: { focus: "정해진 것을 관리하는 힘과 새로운 쓰임을 찾는 힘의 균형", decision: "유지해야 할 돈과 시간을 남긴 뒤 새 선택에 쓸 몫을 따로 정한다. 익숙함이나 새로움 하나만으로 고르지 않는다." },
    authority: { focus: "감당할 돈·시간을 살피는 습관을 맡은 역할의 선택에 쓰기", decision: "해야 한다는 말에 바로 맞추기 전에 실제로 필요한 준비를 확인한다. 할 수 있는 약속을 정하고 그 약속을 지키는 쪽을 고른다." },
    resource: { focus: "지금 남기는 실속과 나중에 도움이 될 배움의 차이", decision: "배우는 데 드는 돈과 시간이 어떤 문제를 줄여 주는지 확인한다. 당장 돈으로 돌아오지 않아도 실제로 쓸 지식인지 따로 본다." },
  },
  authority: {
    peer: { focus: "맡은 역할 안에서도 스스로 정할 수 있는 몫 찾기", decision: "누군가의 허락이 꼭 필요한 일과 내 판단으로 진행할 일을 구분한다. 책임진다는 이유로 모든 선택까지 맡기지 않는다." },
    output: { focus: "약속을 잘 지키는 데 내 설명과 개선을 더하기", decision: "정해진 것을 따르는 데서 끝내지 않고 왜 더 나은지 설명할 방법을 찾는다. 기존 목표를 지키면서 바꿀 수 있는 부분부터 보여 준다." },
    asset: { focus: "책임을 잘 해내는 것과 내게 남는 실속을 함께 보기", decision: "맡을 수 있다는 이유만으로 일을 고르지 않는다. 해낸 뒤에 남는 돈·경험·시간이 무엇인지 보고 선택한다." },
    authority: { focus: "꾸준히 지킬 약속과 급한 요구의 우선순위", decision: "당장 급한 요구를 처리할 때 이미 한 약속이 어떻게 달라지는지 함께 확인한다. 재촉의 크기만으로 순서를 정하지 않는다." },
    resource: { focus: "책임을 혼자 버티는 대신 지식과 도움으로 해내기", decision: "더 노력하면 되는 일과 설명을 듣거나 배워야 풀리는 일을 가른다. 모르는 부분을 일찍 물어 맡은 일을 정확히 이해한다." },
  },
  resource: {
    peer: { focus: "배운 답을 참고하면서도 내 선택의 이유 만들기", decision: "권한 있는 사람의 말이라는 이유와 실제로 내 상황에 맞는 이유를 구분한다. 배운 내용을 내 조건에 맞춰 선택한다." },
    output: { focus: "머릿속에 쌓은 것을 남이 볼 수 있는 형태로 꺼내기", decision: "충분히 알게 될 때까지 기다리기보다 이미 아는 부분을 먼저 만들어 설명한다. 전달되지 않은 부분이 다음에 배울 질문이 된다." },
    asset: { focus: "배움과 준비가 실제로 어디에 쓰일지 확인하기", decision: "더 배울 것을 고를 때 해결할 일과 필요한 비용을 함께 본다. 준비했다는 만족과 실제로 도움이 되는 쓰임을 구분한다." },
    authority: { focus: "배운 것을 요구받는 일에 맞게 골라 쓰기", decision: "아는 내용을 전부 보여 주려 하지 않고 지금 맡은 일에 필요한 것을 고른다. 정해진 기준에 맞춰 실제로 적용해 본다." },
    resource: { focus: "믿을 만한 기본 지식과 새롭게 살필 관점의 차이", decision: "이미 확인한 내용은 바탕으로 두고 설명되지 않는 부분만 다른 방법으로 살핀다. 새 관점이 나올 때마다 배운 것을 전부 버리지 않는다." },
  },
};

/** Annual direction changes how each long cycle's work/money question is used. */
const CYCLE_YEAR_LINKS: Record<GodGroup, Bridge> = {
  peer: { focus: "올해는 다른 사람의 몫과 내 몫이 다를 수 있다는 점을 긴 흐름의 선택에 반영한다.", decision: "함께하는 일이라면 내가 맡은 기여와 공동으로 얻는 도움을 구분한다." },
  output: { focus: "올해는 표현하고 만드는 기능을 긴 흐름의 밑바탕에 붙인다.", decision: "머릿속 생각을 작업·설명·결과로 꺼내서 실제로 쓰이는지 확인한다." },
  asset: { focus: "올해는 돈과 시간의 사용을 긴 흐름의 선택에 붙인다.", decision: "새 선택에 필요한 양과 유지할 때 드는 양을 함께 살핀다." },
  authority: { focus: "올해는 요구받는 역할을 긴 흐름의 일과 돈에 연결한다.", decision: "해야 할 일이 늘어날 때 받을 보상과 계속 들일 시간도 함께 살핀다." },
  resource: { focus: "올해는 배움과 지원을 긴 흐름에서 필요한 능력에 연결한다.", decision: "막연히 준비를 늘리지 않고 지금 하는 일을 더 잘할 질문에 배움을 붙인다." },
};

/**
 * Inner pace has a different object from yearly planning and career accounting.
 * These are reading lenses, not symptoms inferred from someone's birth chart.
 */
const PACE_YEAR_LINKS: Record<GodGroup, Bridge> = {
  peer: { focus: "올해의 동등한 사람·자기 선택이라는 뜻과 평소 판단하는 방식을 함께 읽는다.", decision: "다른 사람의 선택과 내 선택이 같아야 한다는 전제부터 구분한다." },
  output: { focus: "올해의 표현이라는 뜻과 평소 판단하는 방식을 함께 읽는다.", decision: "생각이 다 정리되기를 기다리는 대신, 밖으로 꺼내야 알 수 있는 부분을 고른다." },
  asset: { focus: "올해의 돈과 시간이라는 뜻과 평소 판단하는 방식을 함께 읽는다.", decision: "선택할 때 지금 확인할 수 있는 사실과 아직 모르는 결과를 가른다." },
  authority: { focus: "올해의 역할·평가라는 뜻과 평소 판단하는 방식을 함께 읽는다.", decision: "요청의 내용이 맞는지 살피는 일과 내가 충분한 사람인지 묻는 일을 섞지 않는다." },
  resource: { focus: "올해의 배움·도움이라는 뜻과 평소 판단하는 방식을 함께 읽는다.", decision: "내가 더 생각하면 풀릴 질문과 다른 사람에게 물어야 풀릴 질문을 가른다." },
};

interface WorkSupport { question: string; focus: string; decision: string }

/**
 * These four lenses add a way of working, not another list of annual predictions.
 * Selection requires an actually exposed natal stem and a different god from
 * the two already used. Fixed order below is editorial, never a strength rank.
 */
const WORK_SUPPORT: Partial<Record<TenGod, WorkSupport>> = {
  식신: {
    question: "익힌 솜씨를 계속 쓸 수 있는 일로 어떻게 남길까?",
    focus: "일과 돈의 긴 흐름에, 원국에서 확인한 꾸준히 만들어 내는 기능을 연결한다.",
    decision: "새 일을 받을 때 이미 익힌 방법을 다시 쓸 수 있는지 살핀다. 만들어 둔 것을 다음 일에도 쓸 수 있게 남기면 매번 처음부터 준비하는 양을 줄일 수 있다.",
  },
  상관: {
    question: "내가 고친 방법이 실제 일에서 어떤 가치를 만들까?",
    focus: "일과 돈의 긴 흐름에, 원국에서 확인한 방법을 고치는 기능을 연결한다.",
    decision: "고친 방법이 실제로 줄여 준 시간이나 실수를 확인한다. 새롭다는 점만 말하지 않고 누구에게 어떤 도움이 되는지를 설명한다.",
  },
  정인: {
    question: "배운 것을 써서 반복되는 수고를 어떻게 줄일까?",
    focus: "일과 돈의 긴 흐름에, 원국에서 확인한 배움과 지원을 활용하는 기능을 연결한다.",
    decision: "이미 배운 순서나 도움받은 자료를 실제 일에 적용한다. 다음에도 쓸 수 있게 정리하면 준비에 드는 시간과 매번 혼자 풀어야 하는 일을 구분할 수 있다.",
  },
  편인: {
    question: "나에게 맞는 방법이 일의 수고를 줄여 주는지 어떻게 알까?",
    focus: "일과 돈의 긴 흐름에, 원국에서 확인한 다른 방법을 찾아 익히는 기능을 연결한다.",
    decision: "새 방법을 고를 때 비용과 시간이 실제로 달라지는지 한 작업에 적용해 본다. 다르다는 이유로 늘리지 않고 도움이 된 방법을 남긴다.",
  },
};

function selectWorkSupport(facts: ReportFacts, excluded: string[]) {
  // No inference from hidden-stem counts, missing elements, or unknown hours.
  const names: TenGod[] = ["식신", "상관", "정인", "편인"];
  for (const name of names) {
    const evidence = facts.natalTenGodEvidence.find(entry => entry.tenGod === name && entry.visibleAt.length > 0);
    if (!excluded.includes(name) && evidence && facts.facts.some(fact => fact.id === `natal-god-${name}`)) {
      return { name, evidence, ...WORK_SUPPORT[name]! };
    }
  }
  return null;
}

function getGod(value: string): { name: TenGod; facet: GodFacet } {
  if (!(value in PERSONALIZATION_GOD_FACETS)) throw new Error("개인화 해석에 필요한 십신 근거가 없습니다.");
  const name = value as TenGod;
  return { name, facet: PERSONALIZATION_GOD_FACETS[name] };
}

const READING_GUARD = "계산된 두 십신의 기능을 함께 읽은 현대적 해석이다. 격국·신강약·용신·합화·성공 여부를 판정하지 않는다. 실제 직업·소득·과거 경험·현재 감정을 안다고 쓰지 않는다. guidance의 금지 사항과 한계 설명은 사용자 문장에 옮기지 않는다. 완성 예문을 복사하지 않고 뜻부터 쉬운 말로 풀어 쓴다.";

function fragment(options: {
  id: string; version: string; domain: PersonalizedDomain; conditions: CorpusCondition[];
  grounds: string[]; mechanism: string; focus: string; steps: string[]; decision: string; avoid: string[];
}): CorpusFragment {
  return {
    id: options.id, status: "approved", version: options.version, domains: [options.domain], direction: "mixed", strength: 5,
    conditions: options.conditions, grounds: options.grounds, mechanism: options.mechanism,
    translation: options.focus, concreteScene: "", sceneAnchors: [],
    expansion: {
      mechanismSteps: options.steps, sceneVariants: [], decisionRule: options.decision,
      repetitionGuard: options.avoid.join(" "),
    },
    guidance: READING_GUARD,
  };
}

/** No random selection, present-time dependency, template examples or strength scoring. */
export function buildPersonalizedReportEvidence(facts: ReportFacts, version: string): PersonalizedReportEvidence {
  const annual = getGod(facts.annualTenGod);
  const natalMain = getGod(facts.natalMonthMainTenGod);
  const natalVisible = getGod(facts.natalMonthTenGod);
  const cycle = getGod(facts.daYunTenGod);
  const sameGod = natalMain.name === annual.name;
  const yearlyBridge = sameGod
    ? { focus: annual.facet.sameFocus, decision: annual.facet.sameDecision }
    : natalMain.facet.group === annual.facet.group
      ? SAME_FAMILY_BRIDGES[annual.name]
      : YEAR_BRIDGES[natalMain.facet.group][annual.facet.group];
  const yearlyQuestion = sameGod ? annual.facet.sameQuestion : annual.facet.annualQuestion;
  const careerLink = CYCLE_YEAR_LINKS[annual.facet.group];
  const paceLink = PACE_YEAR_LINKS[annual.facet.group];
  const workSupport = selectWorkSupport(facts, [cycle.name, annual.name]);
  const sectionMetadata: PersonalizedReportEvidence["sectionMetadata"] = {
    yearly: {
      question: yearlyQuestion,
      distinctFocus: yearlyBridge.focus,
      avoidRepeating: ["도입의 성격 비유를 다시 설명하지 않는다.", "일의 비용·보상 계산은 career에, 남의 평가와 내 마음의 구분은 mental에 맡긴다."],
      primaryTerms: [...new Set([annual.name, natalMain.name])],
    },
    career: {
      question: workSupport?.question ?? cycle.facet.cycleQuestion,
      distinctFocus: workSupport ? `${cycle.facet.cycleFocus}. ${workSupport.focus}` : cycle.facet.cycleFocus,
      avoidRepeating: ["yearly에서 설명한 책임·선택의 정의를 반복하지 않는다.", "일을 맡을지 말지보다 오래 남는 능력·쓰임·실속 중 배정된 질문을 깊게 설명한다."],
      primaryTerms: [...new Set([cycle.name, annual.name])],
    },
    mental: {
      question: natalVisible.facet.paceQuestion,
      distinctFocus: natalVisible.facet.paceFocus,
      avoidRepeating: ["돈·담당 범위·마감 확인을 다시 조언하지 않는다.", "모든 사주를 완벽주의·반성회·자기채찍으로 설명하지 않는다. 선택된 판단 과정의 차이만 풀어낸다."],
      primaryTerms: [...new Set([natalVisible.name, annual.name])],
    },
  };
  const yearly = fragment({
    id: `F-PERSONAL-YEAR-${natalMain.name}-${annual.name}`, version, domain: "yearly",
    conditions: [{ field: "natalMonthMainTenGod", equals: natalMain.name }, { field: "annualTenGod", equals: annual.name }],
    grounds: ["natal-month-main-ten-god", "annual-ten-god"],
    mechanism: `원국 월지 본기의 ${natalMain.name}는 ${natalMain.facet.meaning}을 읽는 근거다. 올해 천간의 ${annual.name}는 ${annual.facet.meaning}을 올해의 선택에 적용하는 근거다. ${sameGod ? "두 근거의 기능이 같아 익숙한 주제를 더 구체적으로 적용한다." : natalMain.facet.group === annual.facet.group ? "오행 관계의 가족은 같아도 두 십신의 음양과 기능이 달라 각자의 뜻을 구분한다." : "서로 다른 두 기능의 뜻을 구분한 뒤 맞춰 쓸 부분을 찾는다."}`,
    focus: yearlyBridge.focus,
    steps: [`원국에서 읽을 기능: ${natalMain.facet.meaning}`, `올해에서 읽을 기능: ${annual.facet.meaning}`, yearlyBridge.focus],
    decision: yearlyBridge.decision, avoid: sectionMetadata.yearly.avoidRepeating,
  });
  const career = fragment({
    id: `F-PERSONAL-CAREER-${cycle.name}-${annual.name}${workSupport ? `-${workSupport.name}` : ""}`, version, domain: "career",
    conditions: [{ field: "daYunTenGod", equals: cycle.name }, { field: "annualTenGod", equals: annual.name }],
    grounds: ["da-yun-ten-god", "annual-ten-god", ...(workSupport ? [`natal-god-${workSupport.name}`] : [])],
    mechanism: `현재 ${facts.daYunGanZhi} 대운 천간의 ${cycle.name}는 ${cycle.facet.meaning}을 여러 해의 일과 돈이라는 관점에서 읽는 근거다. 올해 ${annual.name}의 기능은 ${annual.facet.meaning}이다. ${careerLink.focus}${workSupport ? ` 원국의 실제 천간에서 ${workSupport.name}가 확인되어 ${PERSONALIZATION_GOD_FACETS[workSupport.name].meaning}을 일하는 방법의 보조 근거로 더한다.` : ""}`,
    focus: sectionMetadata.career.distinctFocus,
    steps: [cycle.facet.cycleFocus, careerLink.focus, ...(workSupport ? [workSupport.focus] : []), `${cycle.name}의 적용: ${cycle.facet.cycleDecision}`],
    decision: workSupport ? `${workSupport.decision} 이 방법을 ${cycle.facet.cycleFocus}에 적용한다. ${careerLink.decision}` : `${cycle.facet.cycleDecision} 올해 연결점: ${careerLink.decision}`,
    avoid: sectionMetadata.career.avoidRepeating,
  });
  const mental = fragment({
    id: `F-PERSONAL-PACE-${natalVisible.name}-${annual.name}`, version, domain: "mental",
    conditions: [{ field: "natalMonthTenGod", equals: natalVisible.name }, { field: "annualTenGod", equals: annual.name }],
    grounds: ["natal-month-ten-god", "annual-ten-god"],
    mechanism: `원국 월간의 ${natalVisible.name}는 ${natalVisible.facet.meaning}을 읽는 보조 근거다. 올해 ${annual.name}는 ${annual.facet.meaning}을 읽는 근거다. ${paceLink.focus}`,
    focus: natalVisible.facet.paceFocus,
    steps: [`평소 판단에서 읽을 기능: ${natalVisible.facet.meaning}`, paceLink.focus, natalVisible.facet.paceFocus],
    decision: `${natalVisible.facet.paceDecision} 올해 연결점: ${paceLink.decision}`,
    avoid: sectionMetadata.mental.avoidRepeating,
  });
  return { yearly: [yearly], career: [career], mental: [mental], sectionMetadata };
}
