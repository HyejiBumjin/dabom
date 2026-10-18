import { CORPUS_VERSION, selectCorpus } from "@/lib/saju/interpretation-corpus";
import { extractReportFacts, type ReportFacts } from "@/lib/saju/report-facts";
import type { Myeongsik } from "@/lib/saju/myeongsik";
import { MESSAGE_CLOSING_LENGTH, REPORT_PARAGRAPH_LENGTHS, type ParagraphLength } from "@/lib/llm/report-rules";
import { REPORT_EMOTICON_INSTRUCTIONS } from "@/lib/report-emoticons";
import { DEFAULT_REPORT_TONE } from "@/lib/llm/report-config";
import { buildReportTerminology, type ReportTermMeaning } from "@/lib/saju/report-terminology";

export type ReportTone = "warm" | "genz";

export interface ReportRenderPayload {
  corpus_version: string;
  profile: { day_master: string };
  /** 리포트 생성 시점 (KST 기준). 월운의 달을 과거/미래로 구분하는 데 사용. */
  as_of: { year: number; month: number };
  seun: { year: number; ganji: string };
  yearly_context: {
    annual_pillar: string;
    annual_stem_ten_god: string;
    active_da_yun: string;
    timing: Array<{ month: string; ganji: string; relation_to_natal: string; phase: "past" | "current" | "future" }>;
  };
  structural_context: {
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
    fragments: Array<{
      domain: string[];
      direction: string;
      strength: number;
      grounds: string[];
      mechanism: string;
      translation: string;
      expansion?: {
        mechanism_steps: string[];
        decision_rule: string;
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
  const annualCore = annualFragments.filter((fragment) => fragment.grounds.includes("annual-ten-god") && !fragment.grounds.includes("monthly-relation"));
  const monthlyFragments = annualFragments.filter((fragment) => fragment.grounds.includes("monthly-relation"));
  const titles = { essence: "나의 성향과 올해의 요점", yearly: "올해의 중심 흐름", relation: "올해의 관계와 시기", career: "올해의 일과 자원", mental: "올해의 마음의 부담", summary: "따뜻한 마무리" };
  // Give each paragraph a distinct job. The opening only previews the annual
  // theme; monthly interpretation belongs to the relationship paragraph.
  const selected = {
    ...baseSelected,
    outline: baseSelected.outline.map((section) => ({ ...section, title: titles[section.id] })),
    sections: baseSelected.sections.map((section) => ({
      ...section,
      title: titles[section.id],
      fragments: section.id === "essence"
        ? [...section.fragments.filter((fragment) => fragment.grounds.includes("day-master")), ...annualCore.slice(0, 1)]
        : section.id === "yearly"
          ? annualCore
          : section.id === "relation"
            ? [...section.fragments.filter((fragment) => !fragment.grounds.includes("natal-branch-clash")), ...monthlyFragments]
            : section.id === "summary" ? [] : section.fragments,
    })),
  };
  const dayMasterTerms = [({ 甲: "갑목", 乙: "을목", 丙: "병화", 丁: "정화", 戊: "무토", 己: "기토", 庚: "경금", 辛: "신금", 壬: "임수", 癸: "계수" }[reportFacts.dayMaster] ?? reportFacts.dayMaster)];
  const annualTerms = [reportFacts.annualTenGod, ...(reportFacts.annualGanZhi === "丙午" ? ["병오"] : [])];
  const monthlyTerms = reportFacts.monthlyRelationMonths.map((month) => `${month.ordinal}월`);
  // KST 기준 현재 연월 — 월운 시점의 과거/미래 구분용
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const payload: ReportRenderPayload = {
    corpus_version: CORPUS_VERSION,
    profile: { day_master: reportFacts.dayMaster },
    as_of: { year: kstNow.getUTCFullYear(), month: kstNow.getUTCMonth() + 1 },
    seun: { year: reportFacts.targetYear, ganji: reportFacts.annualGanZhi },
    yearly_context: {
      annual_pillar: reportFacts.annualGanZhi,
      annual_stem_ten_god: reportFacts.annualTenGod,
      active_da_yun: reportFacts.daYunGanZhi,
      timing: reportFacts.monthlyRelationMonths.map((month) => {
        const distance = (reportFacts.targetYear - kstNow.getUTCFullYear()) * 12 + month.ordinal - (kstNow.getUTCMonth() + 1);
        return { month: `${month.ordinal}월`, ganji: month.ganZhi, relation_to_natal: month.against, phase: distance < 0 ? "past" : distance === 0 ? "current" : "future" };
      }),
    },
    structural_context: {
      natal_branch_relations: reportFacts.natalBranchRelations,
      annual_branch_relations: reportFacts.annualBranchRelations,
      active_da_yun_branch_relations: reportFacts.daYunBranchRelations,
      monthly_calendar: reportFacts.monthlyCalendar,
    },
    facts: reportFacts.facts,
    terminology: buildReportTerminology(reportFacts),
    outline: selected.outline,
    sections: selected.sections.map((section) => ({
      ...section,
      editorial_focus: section.id === "essence"
        ? "도입. 일간에서 읽는 나의 성향을 2~3문장으로 짚고, 올해 운세의 중심과 그 성향이 올해 어떻게 쓰이는지를 1~2문장으로 예고한다. 올해 세운 근거도 포함한다. 생활 예시·행동 지시·세부 월운은 넣지 않는다."
        : section.id === "yearly"
          ? "올해 바깥 환경의 변화와 기회·부담의 양면을 설명한다. 올해 어떤 요구가 선명해지고 어떤 기준으로 선택이 갈리는지 새 정보를 더한다. 도입의 성격 설명, 커리어의 자원 관리, 특정 월의 관계 설명은 반복하지 않는다."
          : section.id === "relation"
            ? "올해 사람과 약속·대화·일정을 조율하는 흐름을 월운 근거로 설명한다. required_timing_terms는 여기서만 언급한다. 지난 달은 계산상 과거 시점으로 다루고 실제로 겪었다고 단정하지 않는다. 원국의 관계를 올해 발생할 사건으로 바꾸지 않는다."
            : section.id === "career"
              ? "올해 일과 자원 배분의 선택을 설명한다. 대운은 장기 배경으로 한 번만 짚고, 올해 시간·비용·협업의 몫을 어떻게 판단할지 구체화한다. 앞 문단의 역할·평가 설명을 다시 풀지 않는다. 수입이나 투자 결과를 예언하지 않는다."
              : section.id === "mental"
                ? "올해 세운과 일간의 작용이 마음의 부담에 닿는 지점을 설명한다. 성격 소개·대인 조율·자원 관리 대신 피드백을 받은 뒤 부담이 이어지는 방식과 멈출 기준만 다룬다. 건강 진단은 하지 않는다."
                : tone === "genz"
                  ? "세 개의 짧은 메시지로 마무리한다. 첫 메시지는 앞서 설명한 세운의 중심 흐름과 선택 기준을 올해의 종합 운세 한 문장으로 압축하고, 문장 중간에 올해 또는 대상 연도를 넣는다. 두 번째는 해석에서 드러난 강점과 부담을 알아주는 긍정의 메시지다. 세 번째는 약 50~90자로 따뜻한 인사와 응원을 남긴다. 본문의 의미를 정리할 뿐 새 명리 판단은 하지 않으므로 fragments는 비어 있다. 명리 용어·세부 월운·행동 목록은 다시 설명하지 않는다. 결과를 보장하거나 다짐을 요구하지 않는다."
                  : "앞서 본문에서 설명한 부담과 망설임을 이해하는 마음을 2~3문장으로 전한다. 새 명리 해석이 아니므로 fragments는 비어 있다. 올해의 전망·결과·성장·좋은 시기라는 평가를 되풀이하지 않는다. 행동을 권하거나 다짐을 요구하지 않고, 그 부담을 이해하고 독자의 선택을 존중한다. 짧은 응원 뒤에 이야기를 자연스럽게 맺는 한 문장을 더한다. 새 전망이나 같은 조언을 붙이지 않는다.",
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
                ? [reportFacts.mentalInteraction ?? reportFacts.annualTenGod]
                : [],
      required_factual_groups: section.id === "essence" ? [dayMasterTerms, annualTerms] : [],
      // The opening and annual overview establish the time frame. Requiring
      // another marker in every paragraph encourages identical annual openings.
      required_year_terms: section.id === "essence" || section.id === "yearly" ? ["올해", `${reportFacts.targetYear}년`] : [],
      required_timing_terms: section.id === "relation" ? monthlyTerms : [],
      prohibited_terms: section.id === "relation" ? [] : monthlyTerms,
      fragments: section.fragments.map((fragment) => ({
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
        },
        guidance: fragment.grounds.includes("monthly-relation")
          ? "관계 문단에서만 해당 월의 대화·일정 조율로 풀어낸다. 이별·사고·실패나 사용자의 과거 경험을 단정하지 않는다."
          : fragment.guidance,
      })),
    })),
    style: { tone, persona: tone === "genz" ? "짧은 메시지를 이어 보내며 사주를 알려 주는, 은근 킹받게 팩폭하는 젠지 찐친" : "사주를 풀어주는 친한 친구", speech: tone === "genz" ? "'~해·~거든·~네·~지·~잖아'로 말을 건네는 반말. '~다·~한다·~된다·~이다'로 끝내지 않는다. 해석에서 나온 웃긴 비유와 가벼운 팩폭을 섞되 유행어를 나열하지 않는다. 한 메시지에 1~2문장, 약 50~100자로 끊고 빈 줄로 다음 메시지를 이어 보낸다. 처음 나온 전문 용어 바로 옆에 짧은 풀이를 붙인다. 특수문자 표정·별·하트만 전체 3~5개 자연스럽게 섞는다. 컬러 이모지는 쓰지 않는다. 마지막 인사 끝에 고양이 표정 (ฅ•ω•ฅ)♡를 한 번 붙인다. 마지막에는 올해 종합 운세를 한 문장으로 정리하고, 해석에 맞는 긍정의 메시지와 약 50~90자의 따뜻한 인사를 이어 보낸다. '~해보자'식 권유는 쓰지 않는다." : "따뜻하고 직설적인 반말. 운세를 설명하되 '~해보자'식 권유나 매 문단의 행동 지시로 마무리하지 않는다.", paragraph_length: tone === "genz" ? "도입 약 230자, 올해 운세 본문 각 약 330자, 마무리는 sections의 paragraph_length를 따른다. 올해 한 문장 요약과 응원, 마지막 인사도 마무리 분량에 포함한다." : "도입 약 230자, 올해 운세 본문 각 약 330자, 마무리는 sections의 paragraph_length를 따른다. 응원 뒤의 마지막 한마디도 분량에 포함한다." },
    constraints: [
      ...(tone === "genz" ? [REPORT_EMOTICON_INSTRUCTIONS] : []),
      "선택된 fragments와 facts에 없는 명리 판단·사건 예고·직업·건강·금전 결과를 추가하지 않는다.",
      "첫 문단은 나의 성향과 올해의 중심을 함께 소개한다. 두 번째 문단부터는 올해 운세의 서로 다른 측면을 설명한다.",
      "올해·이번 해·연도로 시작하는 문단은 전체에서 최대 하나다. 이후 문단은 배정된 주제의 의미로 시작하고, 연도가 필요하면 문장 중간에 연결한다. 비슷한 시간 표현으로 첫머리만 바꾸지 않는다.",
      "독자의 이름이나 이름을 줄인 호칭은 쓰지 않는다. 필요한 호칭은 너로 쓴다.",
      "relation의 required_timing_terms가 비어 있지 않으면, 그 달들을 월운 기준의 대화·일정 조율 시점으로 모두 언급한다.",
      "structural_context의 12개월 월운표는 계산 근거다. 구체적인 월을 나열하는 section은 relation뿐이다.",
      "나의 원래 성향과 올해의 환경을 구분한다. 원국·대운의 계산을 올해 발생할 사건으로 바꾸지 않는다.",
      tone === "genz"
        ? "마지막 문단은 올해 종합 운세 한 문장, 해석에 맞는 긍정의 메시지, 따뜻한 인사의 세 메시지로 쓴다. 요약은 본문에서 확인된 세운의 의미를 압축한다. 새 예측이나 같은 설명·행동 목록을 덧붙이지 않는다. 마지막 인사는 약 50~90자로 충분히 마음을 전한다."
        : "마지막 문단은 짧은 응원 뒤에 대화를 맺는 한 문장을 더한다. 전체 운세와 같은 조언을 다시 나열하지 않는다. 분량을 채우려고 설명을 반복하지 않는다.",
      "각 section의 editorial_focus와 prohibited_terms를 지켜, 이미 다른 section에서 쓴 시점·장면을 반복하지 않는다.",
      "outline 순서를 정확히 지키고, 사주 용어는 fragment의 mechanism과 translation에 근거해 쉬운 말로 풀어쓴다.",
      "terminology는 용어의 뜻이다. 용어의 첫 등장에 같은 메시지 안에서 짧게 풀고, 반복 등장 때 정의를 재탕하지 않는다. 풀이에서 새 명리 판단이나 사건 예고를 만들지 않는다.",
      "생활 장면은 해석과 선택 원칙을 설명하기 위해 새로 만든다. 사용자의 실제 경험·직업·과거 사건으로 단정하지 않는다.",
    ],
  };
  return { reportFacts, selected, payload };
}
