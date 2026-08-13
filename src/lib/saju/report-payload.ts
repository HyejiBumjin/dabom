import { CORPUS_VERSION, selectCorpus } from "@/lib/saju/interpretation-corpus";
import { extractReportFacts, type ReportFacts } from "@/lib/saju/report-facts";
import type { Myeongsik } from "@/lib/saju/myeongsik";

export interface ReportRenderPayload {
  corpus_version: string;
  profile: { name: string; day_master: string };
  seun: { year: number; ganji: string };
  facts: ReportFacts["facts"];
  outline: Array<{ id: string; title: string }>;
  sections: Array<{
    id: string;
    title: string;
    required_factual_terms: string[];
    /** One natural phrase from each group must appear in the rendered paragraph. */
    required_scene_terms: string[][];
    fragments: Array<{
      domain: string[];
      direction: string;
      strength: number;
      grounds: string[];
      mechanism: string;
      translation: string;
      concrete_scene: string;
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
    facts: reportFacts.facts,
    outline: selected.outline,
    sections: selected.sections.map((section) => ({
      ...section,
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
      required_scene_terms: section.fragments.map((fragment) => fragment.sceneAnchors),
      fragments: section.fragments.map((fragment) => ({
        domain: fragment.domains,
        direction: fragment.direction,
        strength: fragment.strength,
        grounds: fragment.grounds,
        mechanism: fragment.mechanism,
        translation: fragment.translation,
        concrete_scene: fragment.concreteScene,
        guidance: fragment.guidance,
      })),
    })),
    style: { persona: "사주를 잘 풀어주는 20대 친한 친구 다봄", speech: "반말, 직설적이되 따뜻함, 현실 장면 중심", paragraph_length: "섹션당 250~360자" },
    constraints: [
      "선택된 fragments와 facts에 없는 명리 판단·사건 예고·직업·건강·금전 결과를 추가하지 않는다.",
      "각 section의 required_scene_terms에서 각 묶음마다 한 단어 이상을 자연스럽게 사용한다.",
      "outline 순서를 정확히 지키고, 사주 용어는 fragment의 translation과 concrete_scene으로 바로 풀어쓴다.",
    ],
  };
  return { reportFacts, selected, payload };
}
