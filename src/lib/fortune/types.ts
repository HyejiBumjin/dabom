/**
 * Fortune types - rule-based for now, easy to swap with OpenAI later
 */

export type FlowType = "상승" | "변화" | "정체" | "도전" | "회복";

export const INTEREST_OPTIONS = [
  { value: "job_change", label: "이직" },
  { value: "getting_job", label: "취업" },
  { value: "dating", label: "연애" },
  { value: "marriage", label: "결혼" },
  { value: "money", label: "재물" },
  { value: "relationships", label: "인간관계" },
  { value: "health", label: "건강" },
  { value: "self_growth", label: "자기계발" },
] as const;

export type InterestValue = (typeof INTEREST_OPTIONS)[number]["value"];

export interface FortuneInput {
  birthDate: string; // YYYY-MM-DD
  birthTime?: string; // HH:mm or "모름"
  gender?: string;
  name?: string;
  relationship?: string;
  calendarType?: "solar" | "lunar";
  leapMonthType?: "regular" | "leap";
  interests?: string[];
}

export interface FortuneSection {
  title: string;
  headline: string;
  content: string;
}

export function formatKoreanName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "당신";
  const shortName = trimmed.length > 2 ? trimmed.slice(-2) : trimmed;
  return `${shortName}님`;
}

export interface FortuneResult {
  flowType: FlowType;
  headline?: string;
  subheadline?: string;
  elementalAnalysis: string; // 내 사주 간략한 오행 분석
  overall: string; // 전체분위기
  career: string;   // 커리어
  love: string;    // 연애&결혼
  money: string;   // 금전
  cautionMonth: string; // 조심할 달
  opportunityMonth: string; // 기회가 오는 달
  sections: FortuneSection[];
}
