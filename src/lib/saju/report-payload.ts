import { extractReportFacts, type ReportDomain } from "./report-facts";
import type { Myeongsik } from "./myeongsik";
import type { RelationKind } from "./advanced-myeongri";
import { MESSAGE_CLOSING_LENGTH, REPORT_PARAGRAPH_LENGTHS, type ParagraphLength } from "@/lib/llm/report-rules";
import { REPORT_EMOTICON_INSTRUCTIONS, REPORT_EMOTICON_RANGE } from "@/lib/report-emoticons";
import { DEFAULT_REPORT_TONE } from "@/lib/llm/report-config";
import { buildObservationDefinitions, STEM_NAMES } from "./report-definitions";
import { assignTopicTiming, TIMING_DOMAINS } from "./report-topic-timing";
import { buildReadingPlan, READING_PLAN_VERSION, type ReportReadingPlan } from "./report-reading-plan";

export type ReportTone = "warm" | "genz";
export const REPORT_EVIDENCE_VERSION = "calculated-observations-v2";
export interface ReportObservation {
  id: string; scope: "natal" | "annual" | "da-yun" | "monthly";
  kind: string; value: object; terms: string[];
}
export interface ReportSection {
  id: ReportDomain; title: string;
  primary_evidence_ids: string[]; context_evidence_ids: string[]; anchor_evidence_ids: string[];
  required_factual_terms: string[]; required_factual_groups: string[][];
  required_year_terms: string[]; required_timing_terms: string[]; prohibited_terms: string[];
  paragraph_length: ParagraphLength; editorial_focus: string; reading_question: string;
  content_contract: string[]; advanced_terms: string[];
  reading_plan: ReportReadingPlan;
}
export interface ReportRenderPayload {
  evidence_version: string;
  reading_plan_version: string;
  synthesis_context: { rule_version: string; evidence_ids: string[] };
  advanced_context: {
    rule_version: string; birth_time_known: boolean; evidence_ids: string[];
    assessment_status: { strength: string; pattern: string; yongshin: string };
  };
  as_of: { year: number; month: number; instant: string };
  seun: { year: number; ganji: string };
  observations: ReportObservation[];
  /** Canonical periods; monthly observations reference this table by index. */
  yearly_context: { timing: Array<{
    month: string; calendar_year: number; calendar_month: number;
    start_at: string; end_at: string; ganji: string; stem_ten_god: string;
    phase: "past" | "current" | "future";
  }> };
  terminology: Array<{ term: string; meaning: string; interpretive_axes?: string[] }>;
  outline: Array<{ id: ReportDomain; title: string }>;
  sections: ReportSection[];
  style: { tone: ReportTone; speech: string };
  constraints: string[];
}
const TOPICS: Record<ReportDomain, { title: string; question: string; focus: string }> = {
  essence: { title: "나와 올해 이야기", question: "나의 바탕은 무엇이고, 올해 어떤 이야기를 읽게 될까?", focus: "짧고 친근한 시작 뒤 성향 한 가지와 올해의 요점을 예고한다. 세부 풀이와 시기는 본문에 남긴다." },
  yearly: { title: "올해의 큰 흐름", question: "원래 사주와 올해가 만나 가장 두드러지는 변화는 무엇일까?", focus: "도입에서 예고한 올해의 중심을 이어 설명한다. 일·책임 같은 결론을 미리 정하지 않고 실제 계절과 올해의 연결에서 중심을 고른다." },
  relation: { title: "사람과의 관계", question: "가까운 사람과 주고받는 방식에 올해 어떤 차이가 생길까?", focus: "사람 사이 이야기로 자연스럽게 넘어간다. 관계 근거로 교류를 설명한다. 직장 업무나 역할 분담으로만 환원하지 않는다." },
  career: { title: "일과 돈", question: "일을 펼치거나 돈을 다루는 흐름에서 무엇이 두드러질까?", focus: "일과 돈 이야기로 넘어가 대운의 배경과 올해의 실제 연결을 읽는다. 정해진 대가·비용·정산 설명을 모든 사주에 적용하지 않는다." },
  mental: { title: "나의 속도", question: "내 에너지를 쓰고 다시 채우는 방식은 올해 어떻게 드러날까?", focus: "자신의 속도와 관심을 쓰는 이야기로 넘어간다. 앞의 사회적 역할·평가 결론을 마음의 부담으로 바꾸어 반복하지 않는다. 실제 감정·건강을 진단하지 않는다." },
  summary: { title: "마지막 인사", question: "올해의 중심을 한 줄로 남기고 어떻게 응원할까?", focus: "첫 내부 단락은 올해 운세를 한 문장으로 요약한다. 다음에는 본문에 맞는 응원과 약 50~90자의 따뜻한 끝인사를 이어 쓴다. 새 해석·시기·행동 목록을 넣지 않는다." },
};
const DOMAINS = Object.keys(TOPICS) as ReportDomain[];
const RELATION_TERMS: Record<RelationKind, string> = { combination: "합", clash: "충", harm: "해", break: "파", punishment: "형", "self-punishment": "자형", "triple-punishment": "삼형", trine: "삼합", "seasonal-union": "방합" };

/** No corpus imports: computed observations once, then editorial routing by ID. */
export function buildReportRenderPayload(myeongsik: Myeongsik, tone: ReportTone = DEFAULT_REPORT_TONE, asOf = new Date(Date.now())) {
  const reportFacts = extractReportFacts(myeongsik, { asOf });
  const { synthesis: s, advanced: a } = reportFacts;
  const topicTiming = assignTopicTiming(reportFacts);
  const observations: ReportObservation[] = [];
  const ownership = Object.fromEntries(DOMAINS.map(id => [id, [] as string[]])) as Record<ReportDomain, string[]>;
  const synthesisIds: string[] = [], advancedIds: string[] = [];
  const add = (owner: ReportDomain, id: string, scope: ReportObservation["scope"], kind: string, value: object, terms: string[] = [], source?: "synthesis" | "advanced") => {
    if (observations.some(item => item.id === id)) throw new Error("중복된 리포트 계산 근거");
    observations.push({ id, scope, kind, value, terms: [...new Set(terms)] });
    ownership[owner].push(id);
    if (source === "synthesis") synthesisIds.push(id);
    if (source === "advanced") advancedIds.push(id);
  };
  add("essence", "natal-day-master", "natal", "day-master", { stem: reportFacts.dayMaster }, [STEM_NAMES[reportFacts.dayMaster]]);
  add("yearly", "annual-pillar", "annual", "pillar", { ganZhi: reportFacts.annualGanZhi, stemTenGod: reportFacts.annualTenGod }, [reportFacts.annualTenGod]);
  add("yearly", "natal-season", "natal", "season", s.natal.season, [], "synthesis");
  add("yearly", "annual-echo", "annual", "exact-stem-occurrences", s.annualEcho, [s.annualEcho.tenGod], "synthesis");
  add("yearly", "seasonal-climate", "annual", "seasonal-indicators-only", s.climate, ["조후"], "synthesis");
  add("mental", "natal-roots", "natal", "roots", { entries: s.natal.roots }, s.natal.roots.length ? ["통근"] : [], "synthesis");
  add("career", "natal-exposures", "natal", "exposures", { entries: s.natal.exposures }, s.natal.exposures.length ? ["투출", ...s.natal.exposures.map(item => item.tenGod)] : [], "synthesis");
  add("essence", "natal-visible", "natal", "visible-stems", { entries: s.natal.visible }, s.natal.visible.map(item => item.tenGod), "synthesis");
  add("relation", "natal-day-hidden", "natal", "day-hidden-main", { branch: myeongsik.pillars.day.earthlyBranch, tenGod: reportFacts.natalDayMainTenGod }, [reportFacts.natalDayMainTenGod]);
  add("mental", "natal-month-gods", "natal", "month-ten-gods", { visible: reportFacts.natalMonthTenGod, mainHidden: reportFacts.natalMonthMainTenGod }, [reportFacts.natalMonthTenGod, reportFacts.natalMonthMainTenGod]);
  const cycle = myeongsik.fortune.daYun.find(item => item.startYear <= reportFacts.targetYear && item.endYear >= reportFacts.targetYear)!;
  add("career", "active-da-yun", "da-yun", "pillar", { ganZhi: reportFacts.daYunGanZhi, stemTenGod: reportFacts.daYunTenGod, hiddenTenGods: reportFacts.daYunHiddenTenGods, startYear: cycle.startYear, endYear: cycle.endYear }, ["대운", reportFacts.daYunTenGod, ...reportFacts.daYunHiddenTenGods]);
  for (const [index, link] of s.stemLinks.entries()) add(link.from === "da-yun" ? "career" : "yearly", `stem-link-${index}`, "annual", "stem-link", link, link.combination ? ["합"] : [], "synthesis");
  const monthOwner = (ordinal?: number) => TIMING_DOMAINS.find(domain => topicTiming[domain].some(month => month.ordinal === ordinal));
  const scopedOwner = (scope: string, ordinal?: number): ReportDomain | undefined => scope === "monthly" ? monthOwner(ordinal) : scope === "annual" ? "yearly" : scope === "da-yun" ? "career" : "relation";
  for (const relation of a.relations) {
    const owner = scopedOwner(relation.scope, relation.members.find(item => item.scope === "monthly")?.ordinal);
    if (owner) add(owner, relation.id, relation.scope, "branch-relation", relation, [RELATION_TERMS[relation.kind]], "advanced");
  }
  for (const star of a.shinsal) {
    const owner = star.scope === "monthly" ? monthOwner(star.target.ordinal) : star.name === "화개" ? "mental" : star.name === "역마" ? "career" : "relation";
    if (owner) add(owner, star.id, star.scope, "shinsal", star, [star.name], "advanced");
  }
  for (const stage of s.lifeStages) {
    const owner = stage.scope === "natal" ? (stage.position === "day" ? "relation" : "mental") : scopedOwner(stage.scope, stage.ordinal);
    if (owner) add(owner, `life-stage-${stage.position}`, stage.scope, "life-stage", stage, [stage.stage], "synthesis");
  }
  // Unresolved assessments are not interpretive material; their status stays explicit.
  if (a.strength.status === "candidate") add("mental", a.strength.id, "natal", "strength-candidate", { status: a.strength.status, tendency: a.strength.tendency, method: a.strength.method, blockers: a.strength.blockers, evidenceIds: ["natal-season", "natal-roots", "natal-visible"] }, [a.strength.tendency === "strong" ? "신강" : "신약"], "advanced");
  if (a.pattern.status === "candidate") add("career", a.pattern.id, "natal", "pattern-candidate", a.pattern, ["격국", ...a.pattern.candidates.map(item => item.name)], "advanced");
  if (a.yongshin.status === "conditional") add("mental", a.yongshin.id, "natal", "yongshin-conditional", a.yongshin, ["용신"], "advanced");
  const now = asOf.getTime(), kstNow = new Date(now + 9 * 60 * 60 * 1000);
  const timing: ReportRenderPayload["yearly_context"]["timing"] = reportFacts.monthlyRelationMonths.map((month, index) => {
    add(monthOwner(month.ordinal)!, `monthly-${month.ordinal}`, "monthly", "period", { timing_index: index }, [month.stemTenGod]);
    return { month: month.displayLabel, calendar_year: month.calendarYear, calendar_month: month.calendarMonth, start_at: month.startAt, end_at: month.endAt, ganji: month.ganZhi, stem_ten_god: month.stemTenGod, phase: now >= Date.parse(month.endAt) ? "past" : now < Date.parse(month.startAt) ? "future" : "current" };
  });
  const sections: ReportSection[] = DOMAINS.map(id => {
    const contextIds = id === "summary" ? [] : id === "yearly" ? ["natal-day-master"] : ["annual-pillar", ...(id === "essence" ? [] : ["natal-day-master"])];
    const allowed = new Set([...ownership[id], ...contextIds]);
    const readingPlan = buildReadingPlan({ id, primary_evidence_ids: ownership[id], context_evidence_ids: contextIds }, observations);
    return {
      id, title: TOPICS[id].title, primary_evidence_ids: ownership[id], context_evidence_ids: contextIds,
      anchor_evidence_ids: readingPlan.basis_ids,
      reading_plan: readingPlan,
      editorial_focus: TOPICS[id].focus, reading_question: TOPICS[id].question,
      content_contract: id === "summary" ? ["이미 설명한 올해의 중심 한 문장, 그에 맞는 응원과 끝인사"] : id === "essence" ? ["친근한 시작, 성향 한 가지, 올해 요점 한 문장"] : ["배정된 근거 중 서로 연결되는 2~3개를 골라 이 사주에서 읽히는 흐름을 해석", "다른 본문과 다른 중심 결론 하나를 끝까지 설명", "운세 풀이가 중심. 조언은 없어도 되며 최대 한 문장"],
      required_factual_terms: id === "essence" ? [STEM_NAMES[reportFacts.dayMaster]] : id === "yearly" ? [reportFacts.annualTenGod] : id === "career" ? ["대운", reportFacts.daYunTenGod] : id === "mental" ? [reportFacts.natalMonthTenGod] : [],
      required_factual_groups: id === "essence" ? [[STEM_NAMES[reportFacts.dayMaster]], [reportFacts.annualTenGod]] : [],
      required_year_terms: id === "essence" || id === "yearly" ? ["올해", `${reportFacts.targetYear}년`] : [],
      required_timing_terms: topicTiming[id as keyof typeof topicTiming]?.map(month => month.displayLabel) ?? [],
      prohibited_terms: timing.filter(period => !topicTiming[id as keyof typeof topicTiming]?.some(month => month.displayLabel === period.month)).map(period => period.month),
      advanced_terms: [...new Set(observations.filter(item => allowed.has(item.id)).flatMap(item => item.terms))],
      paragraph_length: tone === "genz" && id === "summary" ? MESSAGE_CLOSING_LENGTH : REPORT_PARAGRAPH_LENGTHS[id],
    };
  });
  const payload: ReportRenderPayload = {
    evidence_version: REPORT_EVIDENCE_VERSION,
    reading_plan_version: READING_PLAN_VERSION,
    synthesis_context: { rule_version: s.version, evidence_ids: synthesisIds },
    advanced_context: { rule_version: a.version, birth_time_known: a.birthTimeKnown, evidence_ids: advancedIds, assessment_status: { strength: a.strength.status, pattern: a.pattern.status, yongshin: a.yongshin.status } },
    as_of: { year: kstNow.getUTCFullYear(), month: kstNow.getUTCMonth() + 1, instant: asOf.toISOString() },
    seun: { year: reportFacts.targetYear, ganji: reportFacts.annualGanZhi },
    observations, yearly_context: { timing }, terminology: buildObservationDefinitions(observations.flatMap(item => item.terms)),
    outline: sections.map(({ id, title }) => ({ id, title })), sections,
    style: { tone, speech: `초등학생도 이해하는 쉬운 단어로 성인에게 보내는 따뜻한 반말 메시지. 한 주제는 하나의 긴 메시지. 처음 등장한 용어는 쉬운 풀이 뒤 괄호로만 표시. 특수문자 표정은 전체 ${REPORT_EMOTICON_RANGE}개.` },
    constraints: [
      "observations는 계산 사실이며 완성된 해설이 아니다. 용어 뜻만 바꿔 쓰지 말고 배정된 근거를 연결해 이 사람의 올해를 새롭게 해석한다. 값·관계·시기와 후보 상태는 바꾸거나 추가 계산하지 않는다.",
      "primary_evidence_ids는 해당 주제에서 자세히 풀 근거다. context_evidence_ids는 공유 배경이며 같은 결론을 반복할 허가가 아니다. 근거는 2~3개면 충분하다. 없거나 비어 있는 항목은 언급하지 않는다.",
      "월운의 기간·현재/과거/미래는 yearly_context.timing에만 있다. required_timing_terms의 시작·끝 날짜와 다음 해 연도를 정확히 쓴다. 다른 주제의 기간을 가져오지 않는다.",
      "원국은 타고난 배경, 대운은 여러 해, 세운은 올해, 월운은 해당 기간이다. 연결해서 읽되 시간 범위를 구별한다. 신살·십이운성은 보조 지표다. 반복 글자를 반추 성향으로, 병·사를 질병·죽음으로, 태를 임신으로 해석하지 않는다.",
      "신강약·격국은 후보이며 용신은 억부 관점의 조건부 보완 방향이다. 계산된 적용 범위 안에서만 해석한다. 보류 항목은 생략한다. 합화·조후용신·성격/파격·길흉 점수는 계산되지 않았다.",
      "독자의 이름·실제 직업·연애 상태·과거 경험은 입력되지 않았다. 예시는 해석을 이해시키는 가정으로 새로 만들고 사실처럼 쓰지 않는다. 고전 인용문을 만들지 않는다.",
      ...(tone === "genz" ? [REPORT_EMOTICON_INSTRUCTIONS] : []),
    ],
  };
  return { reportFacts, payload };
}
