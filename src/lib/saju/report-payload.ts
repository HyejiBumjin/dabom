import { CORPUS_VERSION, selectCorpus } from "@/lib/saju/interpretation-corpus";
import { extractReportFacts, type ReportFacts } from "@/lib/saju/report-facts";
import type { Myeongsik } from "@/lib/saju/myeongsik";

export interface ReportRenderPayload {
  corpus_version: string;
  profile: { name: string; day_master: string };
  seun: { year: number; ganji: string };
  yearly_context: {
    annual_pillar: string;
    annual_stem_ten_god: string;
    active_da_yun: string;
    timing: Array<{ month: string; ganji: string; relation_to_natal: string }>;
  };
  structural_context: {
    natal_branch_relations: ReportFacts["natalBranchRelations"];
    annual_branch_relations: ReportFacts["annualBranchRelations"];
    active_da_yun_branch_relations: ReportFacts["daYunBranchRelations"];
    monthly_calendar: ReportFacts["monthlyCalendar"];
  };
  facts: ReportFacts["facts"];
  outline: Array<{ id: string; title: string }>;
  sections: Array<{
    id: string;
    title: string;
    required_factual_terms: string[];
    required_timing_terms: string[];
    prohibited_terms: string[];
    editorial_focus: string;
    fragments: Array<{
      domain: string[];
      direction: string;
      strength: number;
      grounds: string[];
      mechanism: string;
      translation: string;
      concrete_scene: string;
      expansion?: {
        mechanism_steps: string[];
        scene_variants: string[];
        decision_rule: string;
        repetition_guard: string;
      };
      guidance: string;
    }>;
  }>;
  style: { persona: string; speech: string; paragraph_length: string };
  constraints: string[];
}

export function buildReportRenderPayload(myeongsik: Myeongsik, name: string) {
  const reportFacts = extractReportFacts(myeongsik);
  const selected = selectCorpus(reportFacts);
  const payload: ReportRenderPayload = {
    corpus_version: CORPUS_VERSION,
    profile: { name, day_master: reportFacts.dayMaster },
    seun: { year: reportFacts.targetYear, ganji: reportFacts.annualGanZhi },
    yearly_context: {
      annual_pillar: reportFacts.annualGanZhi,
      annual_stem_ten_god: reportFacts.annualTenGod,
      active_da_yun: reportFacts.daYunGanZhi,
      timing: reportFacts.monthlyRelationMonths.map((month) => ({ month: `${month.ordinal}월`, ganji: month.ganZhi, relation_to_natal: month.against })),
    },
    structural_context: {
      natal_branch_relations: reportFacts.natalBranchRelations,
      annual_branch_relations: reportFacts.annualBranchRelations,
      active_da_yun_branch_relations: reportFacts.daYunBranchRelations,
      monthly_calendar: reportFacts.monthlyCalendar,
    },
    facts: reportFacts.facts,
    outline: selected.outline,
    sections: selected.sections.map((section) => ({
      ...section,
      editorial_focus: section.id === "essence"
        ? "일간과 원국의 반복 구조를 이용해, 사용자가 자주 보일 법한 반응 패턴을 구체적으로 짚는다. 올해·월운은 언급하지 않는다."
        : section.id === "yearly"
          ? "세운×대운 조합을 올해의 중심 주제로 삼고, 월운 시점은 이 문단에서만 한 번 명시한다."
          : section.id === "relation"
            ? "원국의 관계 반응 패턴과 충의 의미를 다룬다. 특정 월을 재나열하지 않는다."
            : section.id === "career"
              ? "대운 천간·지지와 원국의 관계를 이용해, 일을 결과물과 경력 자산으로 남기는 방식을 다룬다."
              : section.id === "mental"
                ? "세운과 일간 사이의 오행 작용이 멘탈 루틴에서 어떻게 느껴지는지만 다룬다."
                : "세운×대운의 선택 기준을 한 문장으로 묶는다. 월운·관계 장면을 반복하지 않는다.",
      required_factual_terms: section.id === "essence"
        ? [reportFacts.dayMaster, ({ 甲: "갑목", 乙: "을목", 丙: "병화", 丁: "정화", 戊: "무토", 己: "기토", 庚: "경금", 辛: "신금", 壬: "임수", 癸: "계수" }[reportFacts.dayMaster] ?? reportFacts.dayMaster)]
        : section.id === "yearly"
          ? [reportFacts.annualGanZhi, reportFacts.annualGanZhi === "丙午" ? "병오" : reportFacts.annualTenGod, reportFacts.annualTenGod]
          : section.id === "relation"
            ? reportFacts.monthlyRelation === "clash" ? ["충"] : reportFacts.monthlyRelation === "combination" ? ["합"] : [reportFacts.annualTenGod]
            : section.id === "career"
              ? [reportFacts.daYunGanZhi, reportFacts.daYunGanZhi === "甲申" ? "갑신" : "대운", "대운", reportFacts.daYunTenGod]
              : section.id === "mental"
                ? [reportFacts.mentalInteraction ?? reportFacts.annualTenGod]
                : [reportFacts.daYunGanZhi, reportFacts.daYunGanZhi === "甲申" ? "갑신" : reportFacts.annualGanZhi, reportFacts.annualGanZhi === "丙午" ? "병오" : reportFacts.annualGanZhi],
      required_timing_terms: section.id === "yearly" ? reportFacts.monthlyRelationMonths.map((month) => `${month.ordinal}월`) : [],
      prohibited_terms: section.id === "relation" ? reportFacts.monthlyRelationMonths.map((month) => `${month.ordinal}월`) : [],
      fragments: section.fragments.map((fragment) => ({
        domain: fragment.domains,
        direction: fragment.direction,
        strength: fragment.strength,
        grounds: fragment.grounds,
        mechanism: fragment.mechanism,
        translation: fragment.translation,
        concrete_scene: fragment.concreteScene,
        expansion: fragment.expansion && {
          mechanism_steps: fragment.expansion.mechanismSteps,
          scene_variants: fragment.expansion.sceneVariants,
          decision_rule: fragment.expansion.decisionRule,
          repetition_guard: fragment.expansion.repetitionGuard,
        },
        guidance: fragment.guidance,
      })),
    })),
    style: { persona: "사주를 잘 풀어주는 20대 친한 친구 다봄", speech: "반말, 다정한 20대 친구 어조, 상황·심리 흐름 중심", paragraph_length: "섹션당 430~580자" },
    constraints: [
      "선택된 fragments와 facts에 없는 명리 판단·사건 예고·직업·건강·금전 결과를 추가하지 않는다.",
      "yearly의 required_timing_terms가 비어 있지 않으면, 그 달들을 명리 월운 기준의 주의·조율 시점으로 모두 언급한다.",
      "structural_context의 12개월 월운표는 계산 투명성을 위한 자료다. 구체적인 월을 나열할 수 있는 section은 yearly뿐이다.",
      "각 section의 editorial_focus와 prohibited_terms를 지켜, 이미 다른 section에서 쓴 시점·장면을 반복하지 않는다.",
      "outline 순서를 정확히 지키고, 사주 용어는 fragment의 translation과 concrete_scene으로 바로 풀어쓴다.",
    ],
  };
  return { reportFacts, selected, payload };
}
