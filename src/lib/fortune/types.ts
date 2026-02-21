/**
 * Fortune types - rule-based for now, easy to swap with OpenAI later
 */

export type FlowType = "상승" | "변화" | "정체" | "도전" | "회복";

export interface FortuneInput {
  birthDate: string; // YYYY-MM-DD
  birthTime?: string; // HH:mm or "모름"
  gender?: string;
}

export interface FortuneSection {
  title: string;
  content: string;
}

export interface FortuneResult {
  flowType: FlowType;
  overall: string; // 전체분위기
  career: string;   // 커리어
  love: string;    // 연애
  money: string;   // 금전
  cautionMonth: string; // 조심할 달
  opportunityMonth: string; // 기회가 오는 달
  sections: FortuneSection[];
}
