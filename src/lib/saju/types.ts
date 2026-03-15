export interface NormalizedSajuInput {
  birthDate: string;
  birthTime?: string;
  gender?: string;
  name?: string;
  calendarType: "solar" | "lunar";
  leapMonthType: "regular" | "leap";
}

export interface SajuCanonical {
  provider: "ablecity";
  providerVersion: string;
  normalizedInput: NormalizedSajuInput;
  baseData: Record<string, unknown>;
}
