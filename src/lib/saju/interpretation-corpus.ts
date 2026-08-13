import { DAY_MASTER_SCRIPT, INTERACTION_SCRIPT, TEN_GOD_GROUP_SCRIPT, type ScriptSource } from "@/lib/saju/script-database";
import type { ReportDomain, ReportFacts } from "@/lib/saju/report-facts";

export const CORPUS_VERSION = "2026.1";
export const REPORT_OUTLINE: Array<{ id: ReportDomain; title: string }> = [
  { id: "essence", title: "본질과 성향" },
  { id: "yearly", title: "2026년 환경적 흐름" },
  { id: "relation", title: "관계와 대인 리듬" },
  { id: "career", title: "큰 틀의 커리어 및 재물운" },
  { id: "mental", title: "주의할 멘탈 루틴" },
  { id: "summary", title: "총평과 행동 가이드" },
];

type FactField = "dayMaster" | "annualTenGod" | "dominantTenGodGroup" | "mentalInteraction" | "monthlyRelation" | "careerPattern" | "daYunTenGod";
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
  guidance: string;
}

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
  return { id, status: "approved", version: CORPUS_VERSION, domains, direction: "neutral", strength, conditions, grounds, mechanism: source.mechanism, translation: source.translation, concreteScene: source.concreteScene, sceneAnchors, guidance };
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
      fragments: active.filter((fragment) => fragment.domains.includes(section.id)).sort((a, b) => b.strength - a.strength).slice(0, 3),
    })),
  };
}
