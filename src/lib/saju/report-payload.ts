import { CORPUS_VERSION, INTERPRETATION_CORPUS, selectCorpus, type CorpusFragment } from "@/lib/saju/interpretation-corpus";
import { extractReportFacts, type ReportFacts } from "@/lib/saju/report-facts";
import type { Myeongsik } from "@/lib/saju/myeongsik";
import { MESSAGE_CLOSING_LENGTH, REPORT_PARAGRAPH_LENGTHS, type ParagraphLength } from "@/lib/llm/report-rules";
import { REPORT_EMOTICON_INSTRUCTIONS, REPORT_EMOTICON_RANGE } from "@/lib/report-emoticons";
import { DEFAULT_REPORT_TONE } from "@/lib/llm/report-config";
import { buildReportTerminology, type ReportTermMeaning } from "@/lib/saju/report-terminology";
import { buildMonthlyReportEvidence } from "@/lib/saju/report-monthly-corpus";
import { buildPersonalizedReportEvidence } from "@/lib/saju/report-personalization-corpus";

export type ReportTone = "warm" | "genz";

export interface ReportRenderPayload {
  corpus_version: string;
  profile: { day_master: string };
  /** 리포트 생성 시점 (KST 기준). 월운의 달을 과거/미래로 구분하는 데 사용. */
  as_of: { year: number; month: number; instant: string };
  seun: { year: number; ganji: string };
  yearly_context: {
    annual_pillar: string;
    annual_stem_ten_god: string;
    active_da_yun: string;
    timing: Array<{
      month: string; calendar_year: number; calendar_month: number;
      start_at: string; end_at: string; ganji: string; stem_ten_god: string;
      relations: ReportFacts["monthlyCalendar"][number]["relations"];
      phase: "past" | "current" | "future";
    }>;
  };
  structural_context: {
    natal_month_stem_ten_god: string;
    natal_month_main_ten_god: string;
    natal_ten_god_evidence: ReportFacts["natalTenGodEvidence"];
    natal_branch_relations: ReportFacts["natalBranchRelations"];
    annual_branch_relations: ReportFacts["annualBranchRelations"];
    active_da_yun_branch_relations: ReportFacts["daYunBranchRelations"];
    monthly_calendar: ReportFacts["monthlyCalendar"];
  };
  facts: ReportFacts["facts"];
  terminology: ReportTermMeaning[];
  outline: Array<{ id: string; title: string }>;
  sections: Array<{
    id: string;
    title: string;
    required_factual_terms: string[];
    required_factual_groups: string[][];
    required_year_terms: string[];
    required_timing_terms: string[];
    prohibited_terms: string[];
    paragraph_length: ParagraphLength;
    editorial_focus: string;
    reading_question: string;
    distinct_focus: string;
    avoid_repeating: string[];
    fragments: Array<{
      id: string;
      domain: string[];
      direction: string;
      strength: number;
      grounds: string[];
      mechanism: string;
      translation: string;
      expansion?: {
        mechanism_steps: string[];
        decision_rule: string;
        repetition_guard: string;
      };
      guidance: string;
    }>;
  }>;
  style: { tone: ReportTone; persona: string; speech: string; paragraph_length: string };
  constraints: string[];
}

export function buildReportRenderPayload(myeongsik: Myeongsik, tone: ReportTone = DEFAULT_REPORT_TONE) {
  const reportFacts = extractReportFacts(myeongsik);
  const baseSelected = selectCorpus(reportFacts);
  const annualFragments = baseSelected.sections.find((section) => section.id === "yearly")!.fragments;
  const annualBase = INTERPRETATION_CORPUS.find((fragment) => fragment.id === `F-ANNUAL-${reportFacts.annualTenGod}` && fragment.status === "approved");
  if (!annualBase) throw new Error("승인된 올해 십신 해석이 없습니다.");
  const annualRelations = annualFragments.filter((fragment) => fragment.grounds.some((ground) => ground === "annual-branch-clash" || ground === "annual-branch-combination"));
  const monthlyFragments = buildMonthlyReportEvidence(reportFacts, CORPUS_VERSION);
  const personal = buildPersonalizedReportEvidence(reportFacts, CORPUS_VERSION);
  // The introduction previews the year without importing its detailed advice.
  const annualPreview: CorpusFragment = { ...annualBase, id: `F-ANNUAL-PREVIEW-${reportFacts.annualTenGod}`, expansion: undefined, concreteScene: "", sceneAnchors: [], guidance: "올해의 요점만 한 문장으로 예고한다. 자세한 이유와 조언은 yearly에서 설명한다." };
  const topicPlan = {
    essence: { question: "나는 어떤 성향이고, 올해 어떤 이야기를 읽게 될까?", distinctFocus: "일간의 성향 한 가지와 올해 요점의 짧은 예고", avoidRepeating: ["자세한 올해 선택 기준", "마감·범위·돈의 구체적 조언"] },
    ...personal.sectionMetadata,
    relation: { question: "사람들과 함께할 때 시기별로 무엇을 달리 생각하면 좋을까?", distinctFocus: "각 기간의 십신과 합충을 함께 읽은 서로 다른 대화·참여 방식", avoidRepeating: ["모든 달을 약속 확인이나 역할 나누기로 똑같이 설명", "일·돈 메시지의 장기 운영 방식"] },
    summary: { question: "이 한 해를 어떤 마음으로 기억하면 좋을까?", distinctFocus: "이미 풀어 준 올해의 중심 한 문장과 그에 맞는 응원", avoidRepeating: ["본문의 조언 재나열", "새 명리 판단", "여섯 주제의 장황한 총정리"] },
  };
  const titles = { essence: "나의 성향과 올해의 요점", yearly: "올해의 큰 흐름", relation: "올해의 사람 관계와 시기", career: "올해의 일과 돈", mental: "올해의 마음과 부담", summary: "따뜻한 마무리" };
  const openings = {
    essence: "너의 성향과 올해 이야기를 시작한다는 짧고 친근한 문장으로 연다. 성격을 단정하거나 농담으로 시작하지 않는다.",
    yearly: "첫 문장부터 도입에서 짚은 올해의 가장 중요한 이야기를 이어 간다.",
    relation: "첫 문장에서 사람 사이의 관계와 약속 이야기로 넘어간다. 날짜부터 나열하지 않는다.",
    career: "첫 문장에서 일이나 시간·돈 이야기로 넘어간다.",
    mental: "첫 문장에서 마음이나 부담 이야기로 넘어간다.",
    summary: "올해를 정리하는 첫 문장으로 이야기를 맺는다. 마무리하겠다는 안내만 따로 쓰지 않는다.",
  };
  // Give each paragraph a distinct job. The opening only previews the annual
  // theme; monthly interpretation belongs to the relationship paragraph.
  const selected = {
    ...baseSelected,
    outline: baseSelected.outline.map((section) => ({ ...section, title: titles[section.id] })),
    sections: baseSelected.sections.map((section) => ({
      ...section,
      title: titles[section.id],
      fragments: section.id === "essence"
        ? [...section.fragments.filter((fragment) => fragment.grounds.includes("day-master")), annualPreview]
        : section.id === "yearly"
          ? [...personal.yearly, ...annualRelations]
          : section.id === "relation"
            ? monthlyFragments.length ? monthlyFragments : section.fragments.filter((fragment) => !fragment.grounds.includes("natal-branch-clash"))
            : section.id === "career"
              ? personal.career
              : section.id === "mental" ? personal.mental : [],
    })),
  };
  const dayMasterTerms = [({ 甲: "갑목", 乙: "을목", 丙: "병화", 丁: "정화", 戊: "무토", 己: "기토", 庚: "경금", 辛: "신금", 壬: "임수", 癸: "계수" }[reportFacts.dayMaster] ?? reportFacts.dayMaster)];
  const annualTerms = [reportFacts.annualTenGod, ...(reportFacts.annualGanZhi === "丙午" ? ["병오"] : [])];
  const monthlyTerms = reportFacts.monthlyRelationMonths.map((month) => month.displayLabel);
  const now = Date.now();
  const kstNow = new Date(now + 9 * 60 * 60 * 1000);
  const payload: ReportRenderPayload = {
    corpus_version: CORPUS_VERSION,
    profile: { day_master: reportFacts.dayMaster },
    as_of: { year: kstNow.getUTCFullYear(), month: kstNow.getUTCMonth() + 1, instant: new Date(now).toISOString() },
    seun: { year: reportFacts.targetYear, ganji: reportFacts.annualGanZhi },
    yearly_context: {
      annual_pillar: reportFacts.annualGanZhi,
      annual_stem_ten_god: reportFacts.annualTenGod,
      active_da_yun: reportFacts.daYunGanZhi,
      timing: reportFacts.monthlyRelationMonths.map((month) => {
        return { month: month.displayLabel, calendar_year: month.calendarYear, calendar_month: month.calendarMonth, start_at: month.startAt, end_at: month.endAt, ganji: month.ganZhi, stem_ten_god: month.stemTenGod, relations: month.relations, phase: now >= Date.parse(month.endAt) ? "past" : now < Date.parse(month.startAt) ? "future" : "current" };
      }),
    },
    structural_context: {
      natal_month_stem_ten_god: reportFacts.natalMonthTenGod,
      natal_month_main_ten_god: reportFacts.natalMonthMainTenGod,
      natal_ten_god_evidence: reportFacts.natalTenGodEvidence,
      natal_branch_relations: reportFacts.natalBranchRelations,
      annual_branch_relations: reportFacts.annualBranchRelations,
      active_da_yun_branch_relations: reportFacts.daYunBranchRelations,
      monthly_calendar: reportFacts.monthlyCalendar,
    },
    facts: reportFacts.facts,
    terminology: buildReportTerminology(reportFacts, [
      ...reportFacts.monthlyRelationMonths.map(month => month.stemTenGod),
      ...Object.values(personal.sectionMetadata).flatMap(section => section.primaryTerms),
      ...selected.sections.flatMap(section => section.fragments.flatMap(fragment => fragment.grounds.filter(ground => ground.startsWith("natal-god-")).map(ground => ground.slice("natal-god-".length)))),
    ]).filter(term => !["화극금", "수극화", "비겁", "식상", "재성", "관성", "인성"].includes(term.term)),
    outline: selected.outline,
    sections: selected.sections.map((section) => ({
      ...section,
      reading_question: topicPlan[section.id].question,
      distinct_focus: topicPlan[section.id].distinctFocus,
      avoid_repeating: topicPlan[section.id].avoidRepeating,
      editorial_focus: openings[section.id] + " " + (section.id === "essence"
        ? "핵심은 타고난 성향 한 가지와 올해 가장 신경 쓸 점 한 가지다. 일간의 뜻을 짧게 풀고, 올해 이야기는 다른 문장으로 예고한다. natal-month-ten-god는 성향을 이해하는 데 꼭 도움이 될 때만 보충한다. 새 용어를 더 소개하려고 넣지 않는다. 월간·본기 같은 내부 용어, 생활 예시, 행동 지시, 세부 월운은 넣지 않는다."
        : section.id === "yearly"
          ? "reading_question에 답하며 원래 사주의 바탕과 올해의 근거를 함께 읽어 달라지는 선택을 풀어 준다. 십신 하나의 공통 정의로 끝내지 않고 personal fragment의 서로 다른 두 뜻이 어떻게 이어지는지 설명한다. annual-branch-clash 또는 annual-branch-combination은 그 이야기를 이해하는 데 도움이 될 때만 보충한다. 두 관계를 쓰면 뜻을 각각 설명하고 좋고 나쁨의 점수처럼 더하거나 빼지 않는다. 없는 관계는 생략한다. 성격 소개, 대운, 특정 월 이야기는 여기서 반복하지 않는다. 다 맡아라·범위를 정해라 같은 공통 조언 대신 이 사주에서 선택한 distinct_focus를 끝까지 풀어 준다."
          : section.id === "relation"
            ? "선정된 실제 날짜 범위 2~3개마다 월간 십신과 합충을 함께 읽은 서로 다른 의미를 설명한다. 날짜를 포함해 한 기간은 약 80~100자로 풀고 section 전체 분량을 지킨다. 서로 다른 시기를 모두 장면과 정의로 길게 늘이지 않는다. 해당 기간의 fragment만 사용한다. 같은 합이라도 그달의 십신이 다르면 함께할 때 생각할 점이 다르다. 각 기간의 decision_rule에 있는 차이를 살리고 모든 달을 약속·역할 나누기로 끝내지 않는다. 합·충과 십신의 뜻을 전부 이름 붙여 나열하지 말고 쉬운 생활 의미를 중심으로 연결한다. 서로 다른 targetPillar라는 이유만으로 직업·연애 사건을 만들지 않는다. 날짜 범위는 여기서만 쓴다. past는 지난 시기, current는 지금, future는 앞으로의 시기로 말한다. 실제로 겪은 일은 단정하지 않는다."
            : section.id === "career"
              ? "reading_question에 답하며 여러 해의 배경인 대운과 올해를 함께 읽는다. 이때 무엇에 돈·시간을 들이고 무엇을 남길지 해당 fragment의 구체적인 차이를 설명한다. 추가 natal-god 근거가 있으면 그 근거에서 읽는 방법을 짧게 보태되 실제 직업이나 능력을 안다고 말하지 않는다. 배정된 십신을 모두 정의하려고 한 문단에 몰아넣지 않는다. 함께 읽은 두 근거가 무엇을 뜻하는지는 짧게 풀고, 무엇을 하고 언제 멈출지 설명하는 데 분량을 쓴다. 앞에서 풀어 준 뜻은 반복하지 않는다. 본기 하나로 격국·신강·용신을 판정하거나 수입·투자 결과를 예언하지 않는다."
              : section.id === "mental"
                ? "reading_question에 답하며 원래 내 방식과 올해의 요구 사이에서 생길 수 있는 선택을 설명한다. 두 근거는 이 section에 배정된 fragment를 사용한다. 마음이 바쁜 이유를 무조건 완벽주의·재확인으로 설명하지 않는다. 내가 바라는 것과 바깥에서 필요한 것을 어떻게 구별하면 편한지 distinct_focus를 따른다. 직전 메시지의 마감·예산·분담 조언을 반복하지 않는다. 실제 감정이나 건강 상태를 안다고 말하지 않는다."
                : tone === "genz"
                  ? "한 해의 이야기를 맺는 하나의 메시지로 쓴다. 앞에서 설명한 올해의 가장 중요한 점을 쉬운 한 문장으로 정리하고, 문장 중간에 올해 또는 대상 연도를 넣는다. 이어 해석에서 읽은 장점과 어려움을 알아주는 말을 전한 뒤 약 50~90자의 따뜻한 인사로 마무리한다. 요약·응원·인사는 자연스럽게 이어 쓰고 필요할 때만 같은 메시지 안에 2~3개 내부 단락을 둔다. 본문의 뜻을 정리할 뿐 새 명리 판단은 하지 않으므로 fragments는 비어 있다. 명리 용어·세부 월운·행동 목록은 다시 설명하지 않는다. 결과를 보장하거나 다짐을 요구하지 않는다."
                  : "올해의 중심을 한 문장으로 짧게 정리하고, 앞서 설명한 부담과 망설임을 이해하는 마음과 따뜻한 인사를 이어 하나의 마무리 메시지로 쓴다. 새 명리 해석이 아니므로 fragments는 비어 있다. 새 전망·결과·성장·좋은 시기라는 평가를 덧붙이지 않는다. 행동을 권하거나 다짐을 요구하지 않고, 그 부담을 이해하고 독자의 선택을 존중한다. 같은 조언을 반복하지 않는다."),
      paragraph_length: tone === "genz" && section.id === "summary" ? MESSAGE_CLOSING_LENGTH : REPORT_PARAGRAPH_LENGTHS[section.id],
      required_factual_terms: section.id === "essence"
        ? dayMasterTerms
        : section.id === "yearly"
          ? annualTerms
          : section.id === "relation"
            ? []
            : section.id === "career"
              ? [...new Set([reportFacts.daYunGanZhi === "甲申" ? "갑신" : "대운", "대운", reportFacts.daYunTenGod])]
              : section.id === "mental"
                ? [reportFacts.natalMonthTenGod]
                : [],
      required_factual_groups: section.id === "essence" ? [dayMasterTerms, annualTerms] : [],
      // The opening and annual overview establish the time frame. Requiring
      // another marker in every paragraph encourages identical annual openings.
      required_year_terms: section.id === "essence" || section.id === "yearly" ? ["올해", `${reportFacts.targetYear}년`] : [],
      required_timing_terms: section.id === "relation" ? monthlyTerms : [],
      prohibited_terms: section.id === "relation" ? [] : monthlyTerms,
      fragments: section.fragments.map((fragment) => ({
        id: fragment.id,
        domain: fragment.domains,
        direction: fragment.direction,
        strength: fragment.strength,
        grounds: fragment.grounds,
        mechanism: fragment.mechanism,
        translation: fragment.translation,
        // Keep authored scenes in the corpus for reference; the renderer creates
        // its own illustrations from the interpretation and decision principles.
        expansion: fragment.expansion && {
          mechanism_steps: fragment.expansion.mechanismSteps,
          decision_rule: fragment.expansion.decisionRule,
          repetition_guard: fragment.expansion.repetitionGuard,
        },
        guidance: fragment.guidance,
      })),
    })),
    style: {
      tone,
      persona: tone === "genz" ? "사주를 처음 읽는 성인에게 쉬운 말로 차근차근 알려 주는 따뜻한 친구" : "어려운 사주 이야기를 쉬운 말로 풀어 주는 친한 친구",
      speech: tone === "genz"
        ? `'~해·~거든·~네·~지'로 편하게 말을 건네는 따뜻한 반말. 초등학생도 이해할 일상 단어를 고르되 읽는 사람은 성인으로 존중한다. 한 문장에는 한 가지 생각만 담고, 누가 무엇을 어떻게 하는지 분명히 쓴다. 어려운 명사를 여러 개 이어 붙이지 않는다. 억지 비유·농담·팩폭·유행어는 넣지 않는다. 아기말이나 아이를 가르치는 말투도 쓰지 않는다. '~다·~한다·~된다·~이다'로 끝내지 않는다. 한 section은 큰 주제 하나를 끝까지 설명하는 긴 메시지다. 먼저 이유를 말하고 생활에서 무슨 뜻인지 이어 설명한다. 필요할 때만 내부를 2~3단락으로 나눈다. 처음 나오는 전문 용어는 쉬운 뜻을 먼저 설명한 뒤 바로 뒤에 짧은 한국어 용어만 괄호로 붙인다. 순서는 '쉬운 설명(용어)'다. 특수문자 표정·별·하트만 전체 ${REPORT_EMOTICON_RANGE}개 자연스럽게 섞는다. 컬러 이모지는 쓰지 않는다. 마지막 인사 끝에 고양이 표정 (ฅ•ω•ฅ)♡를 한 번 붙인다. 마무리 메시지 안에서 올해 종합 운세 한 문장, 해석에 맞는 응원, 약 50~90자의 따뜻한 인사를 자연스럽게 이어 쓴다. '~해보자'식 권유는 쓰지 않는다.`
        : "쉽고 따뜻한 반말. 한 문장에는 한 가지 생각만 담고 무엇을 하는지 분명히 쓴다. 어려운 명사를 이어 붙이거나 억지 비유·농담을 만들지 않는다. 성인을 존중하며 아기말이나 가르치는 말투는 쓰지 않는다. 한 section의 주제를 하나의 긴 메시지 안에서 끝까지 풀어 준다. 처음 나온 용어는 쉬운 뜻을 먼저 말한 뒤 괄호에 붙인다. 운세를 설명하되 '~해보자'식 권유나 매 문단의 행동 지시로 마무리하지 않는다.",
      paragraph_length: tone === "genz"
        ? "도입 약 230자, 올해 운세 본문 각 약 330자, 마무리는 sections의 paragraph_length를 따른다. 올해 한 문장 요약과 응원, 마지막 인사도 마무리 분량에 포함한다."
        : "도입 약 230자, 올해 운세 본문 각 약 330자, 마무리는 sections의 paragraph_length를 따른다. 올해 한 문장 요약과 응원, 마지막 인사도 분량에 포함한다.",
    },
    constraints: [
      ...(tone === "genz" ? [REPORT_EMOTICON_INSTRUCTIONS] : []),
      "사주를 처음 읽는 사람도 바로 이해할 단어로 쓴다. 한 문장에 생각을 하나만 담고, 무슨 일을 하는지 대상과 동사를 분명히 쓴다. facts와 fragments에서 뜻을 가져오되 어려운 문구를 그대로 옮기지 않는다. 추상적인 명사를 나열하거나 억지 비유·농담·팩폭을 넣지 않는다. 쉽다고 해서 아기말이나 훈계로 바꾸지 않는다.",
      "reading_question은 독자에게 물어볼 질문이 아니라 이 메시지가 답해야 할 질문이다. distinct_focus를 중심으로 설명하고 avoid_repeating과 expansion.repetition_guard를 지킨다. 같은 십신이 여러 곳에 있어도 같은 정의·조언을 반복하지 않는다. 하나의 조언은 가장 잘 맞는 주제 한 곳에서만 충분히 설명한다. 도입의 한 문장 예고와 마무리의 한 문장 요약만 짧은 재사용을 허용한다.",
      "각 section은 큰 주제 하나를 끝까지 설명하는 긴 메시지 하나다. 왜 그런지, 생활에서 무슨 뜻인지, 무엇을 하면 좋은지 이어 쓴다. 필요할 때만 내부를 2~3단락으로 나눈다. 문장 수나 글자 간격마다 새 메시지로 쪼개지 않는다. 현재 주제를 마친 뒤 다음 주제로 이어 간다.",
      "required_factual_terms와 required_factual_groups는 반드시 지킨다. 그 외의 용어와 fragments를 모두 설명할 필요는 없다. 한 메시지에서 가장 중요한 이야기 하나를 먼저 풀고, 나머지 근거는 이해에 꼭 도움이 될 때만 보충한다. 설명할 용어 수를 늘리느라 쉬운 풀이를 줄이지 않는다.",
      "선택된 fragments와 facts에 없는 명리 판단·사건 예고·직업·건강·금전 결과를 추가하지 않는다.",
      "첫 문단은 운세 이야기를 여는 짧은 문장 뒤에 나의 성향과 올해의 중심을 함께 소개한다. 두 번째 문단부터는 첫 문장에서 다룰 분야를 생활 언어로 짚고 올해 운세의 서로 다른 측면을 설명한다. 전환을 위한 별도 제목·번호·말풍선은 만들지 않는다.",
      "올해·이번 해·연도로 시작하는 문단은 전체에서 최대 하나다. 이후 문단은 배정된 주제의 의미로 시작하고, 연도가 필요하면 문장 중간에 연결한다. 비슷한 시간 표현으로 첫머리만 바꾸지 않는다.",
      "독자의 이름이나 이름을 줄인 호칭은 쓰지 않는다. 필요한 호칭은 너로 쓴다.",
      "relation의 required_timing_terms는 실제 날짜 범위다. 그 기간의 시작·끝 날짜를 포함하고, 대상 연도의 다음 해로 넘어가면 연도를 명확히 쓴다. 절기 순번 ordinal을 달력의 월로 바꾸지 않는다. 날짜의 설명을 '초~말'로 임의 축약하지 않는다.",
      "원국·대운·세운의 근거를 함께 쓰면 원래 성향, 여러 해의 이야기, 올해의 이야기를 구분한다. 근거가 없는 조합·격국·용신·신강약을 추가하지 않는다. 같은 뜻을 다시 정의하지 않고 무엇을 하거나 바꾸면 좋은지 설명한다.",
      "structural_context의 12개월 월운표는 계산 근거다. 구체적인 월을 나열하는 section은 relation뿐이다.",
      "나의 원래 성향과 올해의 환경을 구분한다. 원국·대운의 계산을 올해 발생할 사건으로 바꾸지 않는다.",
      tone === "genz"
        ? "마지막은 하나의 메시지로 올해 종합 운세 한 문장, 해석에 맞는 응원, 따뜻한 인사를 연결한다. 요약은 본문에서 확인된 세운의 의미를 압축한다. 내부 단락은 나눌 수 있지만 별도 메시지로 쪼개지 않는다. 새 예측이나 같은 설명·행동 목록을 덧붙이지 않는다. 마지막 인사는 약 50~90자로 충분히 마음을 전한다."
        : "마지막은 올해의 중심 한 문장과 짧은 응원, 대화를 맺는 인사를 하나의 메시지로 연결한다. 같은 조언을 다시 나열하거나 분량을 채우려고 설명을 반복하지 않는다.",
      "각 section의 editorial_focus와 prohibited_terms를 지켜, 이미 다른 section에서 쓴 시점·장면을 반복하지 않는다.",
      "outline 순서를 정확히 지킨다. fragment의 mechanism과 translation은 해석 근거다. 거기에 있는 어려운 표현을 본문에 옮기지 않는다. 독자에게 전할 쉬운 뜻은 terminology를 우선 사용한다.",
      "terminology는 독자가 이해할 쉬운 뜻이다. 처음 나온 용어는 쉬운 뜻부터 설명한 뒤 해당 한국어 용어만 괄호에 붙인다. 순서는 '쉬운 설명(용어)'다. 괄호에는 짧은 용어 한 개만 쓴다. 뜻을 길게 다시 정의하거나 새 명리 판단과 사건 예고를 만들지 않는다. '기능·자원·기준·조율·여지·감각' 같은 말로 설명을 끝내지 말고 누가 무엇을 하는지 풀어 쓴다.",
      "생활 장면은 해석의 뜻을 알기 쉽게 보여 주기 위해 새로 만든다. 사용자의 실제 경험·직업·과거 사건으로 단정하지 않는다.",
    ],
  };
  return { reportFacts, selected, payload };
}
