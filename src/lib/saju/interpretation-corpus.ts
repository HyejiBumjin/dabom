import { DAY_MASTER_SCRIPT, INTERACTION_SCRIPT, TEN_GOD_GROUP_SCRIPT, type ScriptSource } from "@/lib/saju/script-database";
import type { ReportDomain, ReportFacts } from "@/lib/saju/report-facts";

export const CORPUS_VERSION = "2026.2";
export const REPORT_OUTLINE: Array<{ id: ReportDomain; title: string }> = [
  { id: "essence", title: "본질과 성향" },
  { id: "yearly", title: "2026년 환경적 흐름" },
  { id: "relation", title: "관계와 대인 리듬" },
  { id: "career", title: "큰 틀의 커리어 및 재물운" },
  { id: "mental", title: "주의할 멘탈 루틴" },
  { id: "summary", title: "총평과 행동 가이드" },
];

type FactField = "dayMaster" | "annualTenGod" | "dominantTenGodGroup" | "mentalInteraction" | "monthlyRelation" | "careerPattern" | "daYunTenGod" | "hasNatalClash" | "hasRepeatedNatalBranch" | "daYunNatalRelation" | "annualDaYunTheme";
export interface CorpusCondition { field: FactField; equals: string | string[]; }
export interface CorpusFragment {
  id: string;
  status: "approved";
  version: string;
  domains: ReportDomain[];
  direction: "neutral" | "opportunity" | "caution" | "mixed";
  strength: 1 | 2 | 3 | 4 | 5;
  conditions: CorpusCondition[];
  grounds: string[];
  mechanism: string;
  translation: string;
  concreteScene: string;
  /** Natural-language anchors that prove the rendered copy used this scene. */
  sceneAnchors: string[];
  expansion?: {
    mechanismSteps: string[];
    sceneVariants: string[];
    decisionRule: string;
    repetitionGuard: string;
  };
  guidance: string;
}

const CORPUS_EXPANSION: Record<string, NonNullable<CorpusFragment["expansion"]>> = {
  "F-DAY-辛": {
    mechanismSteps: ["작은 오류나 빈칸을 먼저 감지함", "오류가 내 실력 평가로 이어질까 빠르게 상상함", "확인 행동을 반복한 뒤에야 다음으로 넘어감"],
    sceneVariants: ["메일을 보낸 뒤에도 수신함을 다시 열어 첨부파일을 확인하는 장면", "발표 전날 슬라이드 줄 간격과 오탈자를 계속 만지는 장면", "카톡 문장을 보내기 전 삭제했다 다시 쓰는 장면"],
    decisionRule: "완벽하게 고치려는 시간과 실제로 중요한 오류를 구분한다. 마지막 확인은 한 번으로 끝내고 다음 일로 이동한다.",
    repetitionGuard: "멘탈 문단의 이불 킥·자기채찍 장면과 섞지 말고, 여기서는 디테일을 확인하는 행동만 다룬다.",
  },
  "F-ANNUAL-정관": {
    mechanismSteps: ["올해 외부 기준과 역할이 눈에 띄게 늘어남", "누가 무엇을 책임지는지 확인받는 장면이 많아짐", "받은 역할을 내 결과물로 남길지 선택해야 함"],
    sceneVariants: ["회의가 끝난 뒤 담당자와 마감을 다시 확인하는 장면", "사수가 부탁한 일을 받기 전에 내 기존 마감부터 보여 주는 장면", "클라이언트 피드백을 받은 뒤 수정 범위를 문서로 적는 장면"],
    decisionRule: "부탁을 거절하라는 말이 아니라, 맡을 일의 끝·범위·남는 결과를 확인한 뒤 받는다.",
    repetitionGuard: "커리어 문단의 연봉·포트폴리오 장면을 여기서 길게 반복하지 않는다.",
  },
  "F-GROUP-재성": {
    mechanismSteps: ["결과와 비용을 먼저 계산함", "들인 시간 대비 남는 것이 있는지 따짐", "확실하지 않은 선택보다 숫자와 결과물이 보이는 쪽으로 움직임"],
    sceneVariants: ["무료 체험을 결제하기 전 취소일을 확인하는 장면", "협업 제안을 받으면 시간 대비 내 몫을 계산하는 장면", "쇼핑 장바구니에서 쿠폰·배송비까지 비교하는 장면"],
    decisionRule: "가성비를 아끼는 데만 쓰지 말고, 시간과 경력을 어디에 남길지 판단하는 기준으로 사용한다.",
    repetitionGuard: "올해 문단에서는 현실적 선택의 배경으로 짧게, 커리어 문단에서는 경력 자산의 기준으로 깊게 쓴다.",
  },
  "F-MONTHLY-충": {
    mechanismSteps: ["익숙한 일정이나 말투가 어긋나는 순간이 생김", "감정 반응이 먼저 올라와 관계 전체를 판단하고 싶어짐", "시간을 두면 원래 문제는 일정·표현 방식이었음을 구분할 수 있음"],
    sceneVariants: ["약속 시간이 바뀌었다는 연락에 서운함부터 올라오는 장면", "단톡방 문장을 읽고 바로 답하지 못해 알림만 꺼두는 장면", "업무 요청의 말투보다 마감 변경 자체가 더 부담이었던 걸 나중에 깨닫는 장면"],
    decisionRule: "관계의 결론보다 지금 어긋난 것이 사람·말투·일정 중 무엇인지 먼저 분리한다.",
    repetitionGuard: "구체적인 3·4·10월은 yearly 문단에서만 쓰고, relation에서는 반응 패턴만 다룬다.",
  },
  "F-INTERACTION-화극금": {
    mechanismSteps: ["외부 요구나 피드백이 들어옴", "내 기준이 즉시 더 높아짐", "끝난 일을 다시 검열하며 피로가 길어짐"],
    sceneVariants: ["칭찬을 듣고도 고친 부분만 떠올리는 장면", "잠들기 직전 회의에서 한 말을 다시 재생하는 장면", "완료 버튼을 눌렀는데도 수정할 곳을 찾는 장면"],
    decisionRule: "피드백을 고칠 것과 이미 끝난 일을 후회하는 것으로 나눈다. 오늘 고칠 한 가지만 남기고 나머지는 종료한다.",
    repetitionGuard: "본질 문단의 오탈자 확인과 달리, 여기서는 끝난 뒤에도 자신을 몰아붙이는 루틴을 다룬다.",
  },
};

const annualSource: Record<string, ScriptSource> = {
  정관: { mechanism: "공식적인 역할·평가·약속이 올해 바깥 환경에서 더 또렷해짐.", translation: "밖에서 요구하는 책임과 평가 기준이 평소보다 선명해지는 해.", concreteScene: "내 일도 바쁜데 팀장·사수·클라이언트가 ‘이것도 맡아줄 수 있어?’ 하며 역할을 하나 더 얹는 장면." },
  편관: { mechanism: "강한 압박과 빠른 판단이 요구되는 환경이 들어옴.", translation: "까다로운 기준이나 갑작스러운 압박을 평소보다 자주 마주칠 수 있음.", concreteScene: "일정이 당겨지거나 피드백이 세게 들어와, 평소보다 빠르게 우선순위를 골라야 하는 장면." },
  정재: { mechanism: "일상의 자원과 우선순위를 현실적으로 관리하게 만드는 흐름.", translation: "들어오는 것보다 무엇을 남기고 어디에 쓸지를 보게 되는 해.", concreteScene: "고정 지출과 일정부터 보고, 이번 달에 손에 남길 결과물을 계산하게 되는 장면." },
  편재: { mechanism: "예정 밖의 제안과 선택지가 늘어 자원의 출입이 함께 커짐.", translation: "들어오는 기회와 나가는 에너지를 동시에 골라야 하는 해.", concreteScene: "협업 제안·친구 약속·사고 싶은 물건이 한꺼번에 생겨 무엇부터 잡을지 고르는 장면." },
  식신: { mechanism: "내가 만든 것과 말한 것이 밖으로 나가기 쉬운 흐름.", translation: "준비해 둔 결과물과 표현이 자연스럽게 드러나는 해.", concreteScene: "준비해 둔 자료나 작업물을 누군가에게 보여 주고 반응을 받는 장면." },
  상관: { mechanism: "답답한 방식에 질문이 생기고 내 방식으로 표현하려는 힘이 강해짐.", translation: "‘왜 꼭 이렇게 해야 하지?’라는 생각이 커져 내 방식으로 바꾸고 싶어지는 해.", concreteScene: "문서·발표·콘텐츠를 기존 양식보다 내 스타일에 맞게 고치고 싶은 장면." },
  비견: { mechanism: "내 페이스와 선택을 분명하게 하려는 기운이 커짐.", translation: "주변 의견이 많아도 결국 내 기준으로 하나를 고르고 싶어지는 해.", concreteScene: "여러 의견을 듣고도 마지막에는 내가 감당할 수 있는 선택 하나를 고르는 장면." },
  겁재: { mechanism: "사람들과 몫을 나누는 과정에서 시간과 에너지가 분산되기 쉬움.", translation: "같이 하자는 일은 많은데 정작 내 할 일이 밀릴 수 있는 해.", concreteScene: "부탁과 공동 작업은 쌓이는데 내 마감이 밀려, 어디까지 맡을지 골라야 하는 장면." },
  정인: { mechanism: "배우고 정리한 것을 판단의 기반으로 쓰게 되는 흐름.", translation: "새것을 더 찾기보다 이미 모아 둔 자료를 다시 써먹는 해.", concreteScene: "새 자료를 찾기보다 저장해 둔 메모와 레퍼런스를 다시 펼쳐보는 장면." },
  편인: { mechanism: "익숙한 답보다 내게 맞는 방식과 거리를 찾고 싶어지는 흐름.", translation: "남들 방식을 그대로 따르기보다 내 방식으로 순서를 바꾸고 싶어지는 해.", concreteScene: "다른 사람의 일하는 방식을 따라가기보다 혼자 맞는 도구나 순서를 새로 바꾸는 장면." },
};

function sourceFragment(id: string, domains: ReportDomain[], conditions: CorpusCondition[], grounds: string[], source: ScriptSource, strength: CorpusFragment["strength"], guidance: string, sceneAnchors: string[]): CorpusFragment {
  return { id, status: "approved", version: CORPUS_VERSION, domains, direction: "neutral", strength, conditions, grounds, mechanism: source.mechanism, translation: source.translation, concreteScene: source.concreteScene, sceneAnchors, expansion: CORPUS_EXPANSION[id], guidance };
}

const DAY_MASTER_SCENE_ANCHORS: Record<string, string[]> = {
  甲: ["총대", "야근", "프로젝트"], 乙: ["계산", "리액션", "이득"], 丙: ["표정", "지갑", "모임"], 丁: ["서운", "차단", "선"], 戊: ["고민", "속마음", "침대"],
  己: ["울타리", "통장", "포인트"], 庚: ["결론", "카톡", "핵심"], 辛: ["오탈자", "알림", "이메일"], 壬: ["마감", "벼락치기", "딴짓"], 癸: ["단톡방", "눈치", "시나리오"],
};
const TEN_GOD_SCENE_ANCHORS: Record<string, string[]> = {
  비겁: ["내기", "경조사비", "지출"], 식상: ["상사", "퇴사", "표정"], 재성: ["최저가", "쿠폰", "통장"], 관성: ["부탁", "야근", "평가"], 인성: ["침대", "생각", "시작"],
};
const ANNUAL_SCENE_ANCHORS: Record<string, string[]> = {
  정관: ["팀장", "사수", "역할"], 편관: ["일정", "피드백", "우선순위"], 정재: ["고정 지출", "이번 달", "결과물"], 편재: ["협업", "약속", "선택"],
  식신: ["자료", "작업물", "반응"], 상관: ["문서", "발표", "내 스타일"], 비견: ["의견", "선택", "페이스"], 겁재: ["공동 작업", "마감", "부탁"],
  정인: ["메모", "레퍼런스", "자료"], 편인: ["도구", "순서", "혼자"],
};

const dayMasterFragments = Object.entries(DAY_MASTER_SCRIPT).map(([dayMaster, source]) => sourceFragment(`F-DAY-${dayMaster}`, ["essence"], [{ field: "dayMaster", equals: dayMaster }], ["day-master"], source, 5, "성향을 단정하지 말고, 이 장면이 왜 자주 생기는지 친구처럼 알아봐 준다.", DAY_MASTER_SCENE_ANCHORS[dayMaster]));
const tenGodFragments = Object.entries(TEN_GOD_GROUP_SCRIPT).map(([group, source]) => sourceFragment(`F-GROUP-${group}`, ["yearly", "career"], [{ field: "dominantTenGodGroup", equals: group }], ["dominant-ten-god-group"], source, 3, "현실 장면은 하나만 골라 쓰고, 돈·직장 결과를 단정하지 않는다.", TEN_GOD_SCENE_ANCHORS[group]));
const annualFragments = Object.entries(annualSource).map(([god, source]) => sourceFragment(`F-ANNUAL-${god}`, ["yearly"], [{ field: "annualTenGod", equals: god }], ["annual-ten-god"], source, 4, "올해의 바깥 환경으로만 풀고, 취업·합격·수입을 예언하지 않는다.", ANNUAL_SCENE_ANCHORS[god]));
const interactionFragments = Object.entries(INTERACTION_SCRIPT).flatMap(([key, source]) => {
  if (key === "화극금" || key === "수극화") return [sourceFragment(`F-INTERACTION-${key}`, ["mental"], [{ field: "mentalInteraction", equals: key }], ["mental-interaction"], source, 4, "건강 진단이나 사건 예고 없이, 감정과 행동의 패턴으로만 풀어낸다.", key === "화극금" ? ["이불 킥", "더 잘", "채찍"] : ["현타", "카톡", "혼자"])];
  return [sourceFragment(`F-MONTHLY-${key}`, ["relation"], [{ field: "monthlyRelation", equals: key === "충" ? "clash" : "combination" }], ["monthly-relation"], source, 4, "관계의 종료·이별·사고를 단정하지 말고, 해당 월의 대화와 일정 리듬으로만 쓴다.", key === "충" ? ["단톡방", "알림", "섭섭"] : ["파트너", "발", "답답"])];
});

const careerFragments: CorpusFragment[] = [
  { id: "F-CAREER-ASSET-PEER", status: "approved", version: CORPUS_VERSION, domains: ["career"], direction: "caution", strength: 5, conditions: [{ field: "careerPattern", equals: "asset-with-peer" }], grounds: ["da-yun-ten-god", "career-pattern"], mechanism: "재성의 실속 감각 위에 비겁의 경쟁·분산 기운이 함께 놓인다. 큰 요행이나 사람과 엮인 한 방을 좇으면 자원과 에너지가 새기 쉬움.", translation: "큰돈을 노리기보다 알짜배기 실속과 결과물을 챙겨야 하는 10년의 판.", concreteScene: "변동 큰 투자로 한 방을 노리기보다 월급·연봉 협상·자격증·포트폴리오처럼 손에 남는 결과물을 차곡차곡 쌓는 장면.", sceneAnchors: ["포트폴리오", "연봉", "자격증"], guidance: "투자 손익을 단정하지 말고, 한 방과 실속의 선택 기준으로만 직설적으로 설명한다." },
  { id: "F-CAREER-ASSET", status: "approved", version: CORPUS_VERSION, domains: ["career"], direction: "opportunity", strength: 4, conditions: [{ field: "careerPattern", equals: "asset" }], grounds: ["da-yun-ten-god", "career-pattern"], mechanism: "재성이 대운의 앞에 있어 들어오는 자원보다 무엇을 남기고 어디에 쓸지를 현실적으로 보게 만든다.", translation: "한 번의 화제성보다 지속 가능한 결과물을 챙기는 10년의 판.", concreteScene: "예산·일정·포트폴리오처럼 시간이 지나도 남는 결과물을 하나씩 쌓는 장면.", sceneAnchors: ["예산", "일정", "포트폴리오"], guidance: "수입 증가를 약속하지 않고, 자원을 운영하는 장면에 집중한다." },
  { id: "F-CAREER-RESPONSIBILITY", status: "approved", version: CORPUS_VERSION, domains: ["career"], direction: "mixed", strength: 4, conditions: [{ field: "careerPattern", equals: "responsibility" }], grounds: ["da-yun-ten-god", "career-pattern"], mechanism: "대운의 흐름에 책임과 평가의 기운이 함께 얹혀 맡은 일의 범위와 결과물이 분명할수록 힘이 실린다.", translation: "애매하게 넓히기보다, 내 이름으로 끝까지 남길 일을 고르는 10년의 판.", concreteScene: "정리된 제안서 하나와 끝까지 마무리한 프로젝트 하나를 남기는 장면.", sceneAnchors: ["제안서", "프로젝트", "마무리"], guidance: "승진·이직을 확정하지 말고, 맡은 범위와 결과물의 관계로만 쓴다." },
  { id: "F-CAREER-GENERAL", status: "approved", version: CORPUS_VERSION, domains: ["career"], direction: "neutral", strength: 2, conditions: [{ field: "careerPattern", equals: "general" }], grounds: ["da-yun-ten-god"], mechanism: "10년의 대운 배경 위에 올해 세운이 겹쳐, 당장의 반응보다 오래 남길 일의 방식을 보게 한다.", translation: "올해의 선택을 10년짜리 일의 판과 연결해 보는 시기.", concreteScene: "당장 멋져 보이는 일보다 다음에도 꺼내 쓸 수 있는 결과물 하나를 고르는 장면.", sceneAnchors: ["결과물", "선택", "다음"], guidance: "대운을 운명처럼 말하지 않고, 긴 흐름의 배경으로만 쓴다." },
];

const defaultFragments: CorpusFragment[] = [
  { id: "F-YEARLY-ROLE-RESULTS", status: "approved", version: CORPUS_VERSION, domains: ["yearly"], direction: "mixed", strength: 5, conditions: [{ field: "annualDaYunTheme", equals: "role-and-results" }], grounds: ["annual-da-yun-theme", "annual-ten-god", "da-yun-ten-god"], mechanism: "올해는 정관이 맡은 역할·평가를 선명하게 만들고, 현재 대운의 재성은 그 역할이 실제로 남기는 결과와 자원을 따지게 만든다. 요구를 다 받아내는 것과 내 이름으로 남길 일을 고르는 것이 같은 문제가 된다.", translation: "‘일을 많이 하는 사람’보다 ‘내가 끝낸 결과물이 분명한 사람’ 쪽으로 움직여야 덜 소모되는 해. 부탁을 받을 때도 착한 사람 모드로 다 받기보다, 이 일이 포트폴리오·조건·경험 중 무엇으로 남는지 보는 판.", concreteScene: "팀장에게 새 일을 받았을 때 바로 ‘네’부터 치기보다, 마감·담당 범위·내 이름으로 남는 결과물을 먼저 묻는 장면. 회의 뒤에는 받은 일을 메모로 정리하고, 이번 분기에 보여 줄 작업 하나를 따로 남겨 두는 장면.", sceneAnchors: ["마감", "담당 범위", "결과물"], guidance: "정관과 정재를 따로 설명하지 말고, 올해의 역할 압박과 10년의 실속 감각이 한 선택에서 만난다는 구조로 풀어낸다. 월운 달은 이 fragment에서 쓰지 않는다." },
  { id: "F-ESSENCE-REPEATED-BRANCH", status: "approved", version: CORPUS_VERSION, domains: ["essence"], direction: "neutral", strength: 3, conditions: [{ field: "hasRepeatedNatalBranch", equals: "true" }], grounds: ["natal-branch-overlap"], mechanism: "원국 안에서 같은 지지가 겹친다는 계산값이 있다. 같은 결의 감정·관심사·반응을 한 번 더 붙잡고 확인하는 패턴을 읽는 보조 근거로 쓴다.", translation: "‘이미 생각한 일인데 한 번 더 곱씹는 쪽’에 가까운 결이 있다는 뜻. 한 번 넘긴 카톡도 다시 열어 보고, 마음에 걸린 포인트를 그냥 흘려보내기보다 머릿속에 저장해 두는 쪽.", concreteScene: "대화는 끝났는데 집에 와서 ‘아까 그 말은 무슨 뜻이었지?’ 하고 카톡을 다시 열어보는 장면. 이미 정리한 파일도 마지막으로 한 번 더 열어보고 닫는 장면.", sceneAnchors: ["카톡", "다시", "파일"], guidance: "반복 지지는 성격의 단정이나 길흉이 아니다. 일간 fragment를 보조하는 ‘반복 확인’ 장면으로만 한 번 사용한다." },
  { id: "F-RELATION-NATAL-CLASH", status: "approved", version: CORPUS_VERSION, domains: ["relation"], direction: "mixed", strength: 4, conditions: [{ field: "hasNatalClash", equals: "true" }], grounds: ["natal-branch-clash"], mechanism: "원국 안에 서로 부딪히는 지지 관계가 계산된다. 관계를 끊는다는 뜻이 아니라, 마음으로는 참다가도 일정·말투·거리감이 어긋나면 한 번에 불편함이 올라오는 반응 재료로 쓴다.", translation: "평소에는 맞춰 주다가도 ‘이건 내 방식이 아니야’ 싶은 순간에는 속도가 확 바뀔 수 있는 결. 문제는 사람이 아니라, 참는 시간과 말하는 타이밍이 엇갈리는 데서 생기기 쉽다.", concreteScene: "회의나 약속에서는 괜찮다고 넘겼는데 집에 와서 갑자기 기분이 올라와 답장 창을 열었다 닫는 장면. 서운한 이유를 바로 말하지 못하고, 먼저 일정부터 취소하고 싶어지는 장면.", sceneAnchors: ["답장 창", "서운", "일정"], guidance: "관계 문단의 고유 재료다. 3·4·10월을 다시 나열하지 말고, 원국 내부의 반응 패턴과 말하는 타이밍만 다룬다." },
  { id: "F-CAREER-DAYUN-COMBINATION", status: "approved", version: CORPUS_VERSION, domains: ["career"], direction: "mixed", strength: 4, conditions: [{ field: "daYunNatalRelation", equals: "combination" }], grounds: ["da-yun-branch-relation"], mechanism: "현재 대운의 지지와 원국 지지가 합으로 계산된다. 긴 흐름에서 혼자 속도만 내기보다, 이미 가진 환경·협업·기존 경험과 엮여 결과를 만드는 재료로 쓴다.", translation: "완전히 새 판을 뒤집기보다 지금 연결된 사람·기술·경력을 조합해서 내 몫을 만드는 10년의 결. 남의 방식에 끌려가기만 하라는 뜻은 아니고, 혼자 새로 시작하는 비용을 따져 보라는 뜻.", concreteScene: "완전히 새로운 공부를 벌이기보다, 지금 하던 업무에서 맡은 파트를 조금 더 선명하게 만들어 포트폴리오 한 줄로 바꾸는 장면. 협업할 때도 내 담당 범위를 문서로 남겨 두는 장면.", sceneAnchors: ["협업", "담당 범위", "문서"], guidance: "대운 지지의 합은 현재 대운의 실속 fragment를 보완한다. 연애·결혼·특정 파트너를 예언하지 말고, 협업과 경력 자산의 결합으로만 푼다." },
  { id: "F-SUMMARY-ROLE-RESULTS", status: "approved", version: CORPUS_VERSION, domains: ["summary"], direction: "neutral", strength: 5, conditions: [{ field: "annualDaYunTheme", equals: "role-and-results" }], grounds: ["annual-da-yun-theme"], mechanism: "올해의 역할·평가와 현재 대운의 실속 추구가 동시에 계산된다. 넓게 벌이는 선택보다, 맡은 일을 어떻게 내 결과물로 남길지 정리하는 쪽에 초점이 맞는다.", translation: "올해의 키워드는 ‘바쁨’이 아니라 ‘남는 것’. 해야 할 일이 많을수록 내 이름으로 남길 한 가지를 골라야 한다는 뜻.", concreteScene: "이번 주 할 일에서 남에게 보여 줄 결과물 하나, 나중에 다시 쓰게 될 문서 하나, 미뤄 둔 대화 하나를 고르고 각각 끝나는 기준을 적어 두는 장면.", sceneAnchors: ["이번 주", "문서", "끝나는 기준"], guidance: "월운·관계 장면을 반복하지 않는다. 리포트 전체의 선택 기준을 한 번에 묶고 끝낸다." },
  { id: "F-YEARLY-CLASH-RHYTHM", status: "approved", version: CORPUS_VERSION, domains: ["yearly"], direction: "mixed", strength: 3, conditions: [{ field: "monthlyRelation", equals: "clash" }], grounds: ["monthly-relation"], mechanism: "올해 월운 중 원국과 부딪히는 달이 있어, 연초·연말 전체가 나쁘다는 뜻이 아니라 특정 시기에는 기존 일정과 대화의 리듬이 더 쉽게 흔들린다.", translation: "평소에는 넘길 일도 유독 걸리고, 미뤄 둔 대화나 일정이 다시 눈앞에 올라오는 달이 있다는 뜻.", concreteScene: "이미 바쁜데 일정 변경 연락이 겹치거나, 단톡방에서 넘겼던 말이 다시 신경 쓰여 답장을 미루고 싶은 장면. 그때는 바로 결론내리기보다 답장 창을 닫고 다음 날 다시 보는 쪽이 덜 꼬인다.", sceneAnchors: ["답장", "일정", "다음 날"], guidance: "월운의 해당 월을 명시하되 이별·사고·실패를 예고하지 말고, 대화와 일정의 마찰이 늘 수 있는 시기로만 설명한다." },
  { id: "F-YEARLY-COMBINATION-RHYTHM", status: "approved", version: CORPUS_VERSION, domains: ["yearly"], direction: "mixed", strength: 3, conditions: [{ field: "monthlyRelation", equals: "combination" }], grounds: ["monthly-relation"], mechanism: "올해 월운 중 원국과 묶이는 달이 있어, 연초·연말 전체가 막힌다는 뜻이 아니라 특정 시기에는 사람·일정과의 조율에 시간이 더 든다.", translation: "혼자 빨리 끝내고 싶은데 상대 답이나 팀 일정 때문에 순서가 늦어지는 달이 있다는 뜻.", concreteScene: "내 몫은 끝났는데 파트너의 답이나 팀 일정이 남아 다음 단계로 못 넘어가고, 괜히 재촉하는 카톡을 쓰다 지우는 장면. 그럴 땐 기다리는 일과 내가 끝낼 일을 분리하는 게 낫다.", sceneAnchors: ["파트너", "일정", "카톡"], guidance: "월운의 해당 월을 명시하되 관계의 결속이나 사건을 단정하지 말고, 조율 시간이 필요한 시기로만 설명한다." },
  { id: "F-RELATION-DEFAULT", status: "approved", version: CORPUS_VERSION, domains: ["relation"], direction: "neutral", strength: 2, conditions: [{ field: "monthlyRelation", equals: "none" }], grounds: ["annual-ten-god"], mechanism: "뚜렷한 충·합이 확인되지 않을 때는 올해 환경의 역할과 압박이 관계 리듬에 간접적으로 닿을 수 있다.", translation: "관계를 운명처럼 해석하기보다, 바쁜 날의 말투와 답장 속도가 달라질 수 있는 정도로 보는 흐름.", concreteScene: "피곤한 날 단톡방 답장을 미뤘다가, 마음이 정리된 뒤 짧고 정확하게 다시 답하는 장면.", sceneAnchors: ["단톡방", "답장", "피곤"], guidance: "이별·새 인연을 예언하지 않고, 대화의 속도와 경계만 현실적으로 다룬다." },
  { id: "F-MENTAL-DEFAULT", status: "approved", version: CORPUS_VERSION, domains: ["mental"], direction: "neutral", strength: 2, conditions: [{ field: "mentalInteraction", equals: "null" }], grounds: ["annual-ten-god"], mechanism: "올해 들어오는 역할과 내 기준이 맞물리면 생각을 오래 끌기 쉬울 수 있다.", translation: "할 일을 다 끝낸 뒤에도 혼자 반성회를 길게 열지 않도록 보는 흐름.", concreteScene: "보낸 메시지를 계속 다시 읽고 싶어질 때, 다음 날 한 번만 확인하고 화면을 닫는 장면.", sceneAnchors: ["메시지", "다음 날", "화면"], guidance: "건강 진단 없이, 작고 구체적인 멈춤 장치 하나를 제안한다." },
];

const summaryFragment: CorpusFragment = { id: "F-SUMMARY-RESULT", status: "approved", version: CORPUS_VERSION, domains: ["summary"], direction: "neutral", strength: 3, conditions: [], grounds: ["da-yun-ten-god", "annual-ten-god"], mechanism: "대운은 긴 흐름의 배경이고 세운은 올해의 환경이다. 둘을 합쳐 당장 무슨 일이 일어난다고 결론내리지는 않는다.", translation: "더 많은 일을 벌이는 것보다 이미 가진 준비를 손에 남는 결과물로 바꾸는 쪽에 힘이 실리는 해.", concreteScene: "이번 주 할 일 중 남에게 보여 줄 하나, 돈이나 시간을 아낄 하나, 미뤄 둔 대화 하나를 골라 끝내는 장면.", sceneAnchors: ["이번 주", "결과물", "대화"], guidance: "한 줄 응원으로 마무리하되 운명적 약속을 하지 않는다." };

export const INTERPRETATION_CORPUS: CorpusFragment[] = [...dayMasterFragments, ...tenGodFragments, ...annualFragments, ...interactionFragments, ...careerFragments, ...defaultFragments, summaryFragment];

function matches(fragment: CorpusFragment, facts: ReportFacts) {
  return fragment.status === "approved" && fragment.conditions.every((condition) => {
    const expected = Array.isArray(condition.equals) ? condition.equals : [condition.equals];
    return expected.includes(String(facts[condition.field] ?? "null"));
  });
}

export interface SelectedCorpus {
  outline: typeof REPORT_OUTLINE;
  sections: Array<{ id: ReportDomain; title: string; fragments: CorpusFragment[] }>;
}

/** Selects only approved, fact-matched corpus. This is the content boundary before the LLM. */
export function selectCorpus(facts: ReportFacts): SelectedCorpus {
  const active = INTERPRETATION_CORPUS.filter((fragment) => matches(fragment, facts));
  return {
    outline: REPORT_OUTLINE,
    sections: REPORT_OUTLINE.map((section) => ({
      ...section,
      fragments: active.filter((fragment) => fragment.domains.includes(section.id)).sort((a, b) => b.strength - a.strength).slice(0, 4),
    })),
  };
}
