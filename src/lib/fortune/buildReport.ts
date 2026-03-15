/**
 * Report Builder: orchestrates the full interpretation pipeline
 *
 * Flow:
 *   SajuCanonical + FortuneInput
 *     → deriveSignals (natal)
 *     → calculateYearlySignals (2026 병오년)
 *     → rules (prose for each section)
 *     → titleGenerator (engaging Korean titles)
 *     → FortuneResult (same shape the UI expects)
 */

import type { FortuneInput, FortuneResult, FortuneSection, FlowType } from "./types";
import { formatKoreanName } from "./types";
import type { SajuCanonical } from "@/lib/saju/types";
import { deriveSignals, ELEMENT_KOR } from "./deriveSignals";
import { calculateYearlySignals } from "./yearlyFlow";
import {
  buildOverallMood,
  buildWhySection,
  buildCareerSection,
  buildRelationshipSection,
  buildWealthSection,
  buildHealthSection,
  buildCautionSection,
  buildOpportunitySection,
  buildStrategySection,
  buildMonthlyProse,
} from "./rules";
import {
  generateHeadline,
  generateOverallTitle,
  generateWhyTitle,
  generateCareerTitle,
  generateRelationshipTitle,
  generateWealthTitle,
  generateHealthTitle,
  generateCautionTitle,
  generateOpportunityTitle,
  generateStrategyTitle,
  generateMonthlyTitle,
} from "./titleGenerator";

function monthsKor(months: number[]): string {
  return months.map((m) => `${m}월`).join(", ");
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function buildInterpretedReport(input: FortuneInput, canonical: SajuCanonical): FortuneResult {
  const natal = deriveSignals(canonical);
  const yearly = calculateYearlySignals(natal);
  const name = formatKoreanName(input.name || "");

  const headline = generateHeadline(natal, yearly);

  const overallProse = buildOverallMood(natal, yearly, name);
  const whyProse = buildWhySection(natal, yearly, name);
  const careerProse = buildCareerSection(natal, yearly, name);
  const relationshipProse = buildRelationshipSection(natal, yearly, name);
  const wealthProse = buildWealthSection(natal, yearly, name);
  const healthProse = buildHealthSection(natal, yearly, name);
  const cautionProse = buildCautionSection(natal, yearly, name);
  const opportunityProse = buildOpportunitySection(natal, yearly, name);
  const strategyProse = buildStrategySection(natal, yearly, name);
  const monthlyParts = buildMonthlyProse(natal, yearly, name);

  const monthlyContent = monthlyParts
    .map((mp) => `${mp.month}월\n${mp.prose}`)
    .join("\n\n");

  const sections: FortuneSection[] = [
    {
      title: "2026년 전체 무드",
      headline: generateOverallTitle(natal, yearly),
      content: overallProse,
    },
    {
      title: "왜 이런 흐름인가",
      headline: generateWhyTitle(natal, yearly),
      content: whyProse,
    },
    {
      title: "커리어",
      headline: generateCareerTitle(natal, yearly),
      content: careerProse,
    },
    {
      title: "관계와 사랑",
      headline: generateRelationshipTitle(natal, yearly),
      content: relationshipProse,
    },
    {
      title: "재정과 자산",
      headline: generateWealthTitle(natal, yearly),
      content: wealthProse,
    },
    {
      title: "건강과 에너지",
      headline: generateHealthTitle(natal, yearly),
      content: healthProse,
    },
    {
      title: "주의 구간",
      headline: generateCautionTitle(natal, yearly),
      content: cautionProse,
    },
    {
      title: "기회 포인트",
      headline: generateOpportunityTitle(natal, yearly),
      content: opportunityProse,
    },
    {
      title: "올해의 전략",
      headline: generateStrategyTitle(natal, yearly),
      content: strategyProse,
    },
    {
      title: "1월~12월 월별 운세",
      headline: generateMonthlyTitle(),
      content: monthlyContent,
    },
  ];

  const dominantKor = natal.dominantElementKor;
  const weakKor = natal.weakElementKor;

  const elementalAnalysis =
    `오행 분포는 ${natal.fiveDistribution.map(([k, v]) => `${ELEMENT_KOR[k] || k} ${formatNum(v)}`).join(", ")}이며, ` +
    `강한 기운은 ${dominantKor}, 약한 기운은 ${weakKor}입니다. ` +
    `2026년 병오(丙午)의 강한 화 에너지와 만나면서 ${dominantKor}의 특성이 올해 운의 방향을 크게 좌우합니다.`;

  return {
    flowType: yearly.flowType,
    headline: `2026년 운세 리포트`,
    subheadline: headline,
    elementalAnalysis,
    overall: overallProse.slice(0, 200) + "…",
    career: yearly.career.coreMessage.slice(0, 150) + "…",
    love: yearly.relationship.coreMessage.slice(0, 150) + "…",
    money: yearly.wealth.coreMessage.slice(0, 150) + "…",
    cautionMonth: monthsKor(yearly.cautionMonths),
    opportunityMonth: monthsKor(yearly.opportunityMonths),
    sections,
  };
}
