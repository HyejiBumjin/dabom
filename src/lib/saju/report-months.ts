import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { Solar } = require("lunar-javascript") as {
  Solar: { fromYmd(year: number, month: number, day: number): {
    getLunar(): { getJieQiTable(): Record<string, { toYmdHms(): string }> };
  } };
};

export interface ReportMonthPeriod {
  /** Solar-term month number: 1 starts at Lichun; 12 starts next January. */
  ordinal: number;
  calendarYear: number;
  calendarMonth: number;
  /** Inclusive start and exclusive end, both expressed in Korea Standard Time. */
  startAt: string;
  endAt: string;
  displayLabel: string;
}

// July selects the target lunar year's table. Uppercase keys are the next
// year's terms in lunar-javascript's JIE_QI_IN_USE, not the January before it.
const MONTH_BOUNDARIES = ["立春", "惊蛰", "清明", "立夏", "芒种", "小暑", "立秋", "白露", "寒露", "立冬", "大雪", "XIAO_HAN", "LI_CHUN"] as const;

function toKoreanTime(chinaLocalDateTime: string): string {
  // lunar-javascript/lunar.js LunarYear._compute explicitly returns Beijing
  // time (UTC+08). Interpret that offset first, then format the same instant
  // at UTC+09; this also handles midnight/day/month/year rollover correctly.
  const instant = Date.parse(`${chinaLocalDateTime.replace(" ", "T")}+08:00`);
  if (!Number.isFinite(instant)) throw new Error("월운 절입 시각을 계산하지 못했습니다.");
  return `${new Date(instant + 9 * 60 * 60 * 1000).toISOString().slice(0, 19)}+09:00`;
}

/** Report-only dates; the persisted birth chart and policy adapter stay intact. */
export function buildReportMonthPeriods(targetYear: number): ReportMonthPeriod[] {
  if (!Number.isInteger(targetYear) || targetYear < 1 || targetYear > 9998) throw new Error("월운 대상 연도가 올바르지 않습니다.");
  const table = Solar.fromYmd(targetYear, 7, 1).getLunar().getJieQiTable();
  const boundaries = MONTH_BOUNDARIES.map((term) => {
    const solar = table[term];
    if (!solar) throw new Error(`월운 절입 데이터가 없습니다: ${term}`);
    return toKoreanTime(solar.toYmdHms());
  });
  return boundaries.slice(0, -1).map((startAt, index) => {
    const endAt = boundaries[index + 1];
    const [calendarYear, calendarMonth, startDay] = startAt.slice(0, 10).split("-").map(Number);
    const [endYear, endMonth, endDay] = endAt.slice(0, 10).split("-").map(Number);
    if (Date.parse(startAt) >= Date.parse(endAt)) throw new Error("월운 절입 순서가 올바르지 않습니다.");
    const startLabel = `${calendarYear === targetYear ? "" : `${calendarYear}년 `}${calendarMonth}월 ${startDay}일`;
    const endLabel = `${endYear === calendarYear ? "" : `${endYear}년 `}${endMonth}월 ${endDay}일`;
    return { ordinal: index + 1, calendarYear, calendarMonth, startAt, endAt, displayLabel: `${startLabel}~${endLabel}` };
  });
}
