export type PillarName = "year" | "month" | "day" | "hour";

export interface MyeongsikPillar {
  ganZhi: string;
  heavenlyStem: string;
  earthlyBranch: string;
  hiddenStems: string[];
  stemTenGod: string;
  hiddenTenGods: string[];
  elementPair: string;
}

export interface MyeongsikFortunePeriod {
  ganZhi: string;
  startYear: number;
  endYear: number;
}

export interface Myeongsik {
  version: 1;
  policy: {
    timezone: string;
    ziHour: "sect-2";
    solarTermBoundary: "exact-instant";
    koreanDstAdjusted: boolean;
    longitudeCorrection: "not-applied";
  };
  input: {
    calendar: "solar" | "lunar";
    isLeapMonth: boolean;
    localDateTime: string;
    timezone: string;
    birthTimeKnown: boolean;
  };
  lunarDate: string;
  dayMaster: string;
  pillars: Record<PillarName, MyeongsikPillar>;
  fortune: {
    targetYear: number;
    direction: "forward" | "backward";
    startsAt: string;
    daYun: MyeongsikFortunePeriod[];
    yearly: Array<{ year: number; ganZhi: string }>;
    monthly: Array<{ ordinal: number; ganZhi: string }>;
  };
  shinsal: {
    status: "pending-korean-rule-table";
    items: [];
  };
}

export interface KoreanSajuInput {
  birthDate: string;
  birthTime: string;
  gender: "male" | "female";
  calendar: "solar" | "lunar";
  isLeapMonth?: boolean;
  timezone?: string;
  /** Required only for the repeated 02:00–02:59 hour when Korean DST ended. */
  dstOccurrence?: "daylight" | "standard";
  birthTimeKnown?: boolean;
}
