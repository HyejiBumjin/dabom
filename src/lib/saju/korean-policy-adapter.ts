import { createRequire } from "node:module";
import type { KoreanSajuInput, Myeongsik, MyeongsikPillar, PillarName } from "./myeongsik";

const require = createRequire(import.meta.url);
const { Solar, Lunar } = require("lunar-javascript") as {
  Solar: { fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): LunarSolar };
  Lunar: { fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): { getSolar(): LunarSolar } };
};

interface EightChar {
  setSect(sect: number): void;
  getYun(gender: number, sect: number): Yun;
  getDayGan(): string;
  getYear(): string; getYearGan(): string; getYearZhi(): string; getYearHideGan(): string; getYearShiShenGan(): string; getYearShiShenZhi(): string; getYearWuXing(): string;
  getMonth(): string; getMonthGan(): string; getMonthZhi(): string; getMonthHideGan(): string; getMonthShiShenGan(): string; getMonthShiShenZhi(): string; getMonthWuXing(): string;
  getDay(): string; getDayGan(): string; getDayZhi(): string; getDayHideGan(): string; getDayShiShenGan(): string; getDayShiShenZhi(): string; getDayWuXing(): string;
  getTime(): string; getTimeGan(): string; getTimeZhi(): string; getTimeHideGan(): string; getTimeShiShenGan(): string; getTimeShiShenZhi(): string; getTimeWuXing(): string;
}
interface LunarSolar { getLunar(): { toString(): string; getEightChar(): EightChar }; toYmdHms(): string }
interface Yun { isForward(): boolean; getStartSolar(): { toYmdHms(): string }; getDaYun(count?: number): DaYun[] }
interface DaYun { getGanZhi(): string; getStartYear(): number; getEndYear(): number; getLiuNian(): LiuNian[] }
interface LiuNian { getYear(): number; getGanZhi(): string; getLiuYue(): LiuYue[] }
interface LiuYue { getGanZhi(): string }

const PILLAR_METHODS: Record<PillarName, readonly [string, string, string, string, string, string, string]> = {
  year: ["getYear", "getYearGan", "getYearZhi", "getYearHideGan", "getYearShiShenGan", "getYearShiShenZhi", "getYearWuXing"],
  month: ["getMonth", "getMonthGan", "getMonthZhi", "getMonthHideGan", "getMonthShiShenGan", "getMonthShiShenZhi", "getMonthWuXing"],
  day: ["getDay", "getDayGan", "getDayZhi", "getDayHideGan", "getDayShiShenGan", "getDayShiShenZhi", "getDayWuXing"],
  hour: ["getTime", "getTimeGan", "getTimeZhi", "getTimeHideGan", "getTimeShiShenGan", "getTimeShiShenZhi", "getTimeWuXing"],
};

interface DateParts { year: number; month: number; day: number; hour: number; minute: number }

function parseDateTime(input: KoreanSajuInput): DateParts {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate) || !/^\d{2}:\d{2}$/.test(input.birthTime)) {
    throw new Error("birthDate must be YYYY-MM-DD and birthTime must be HH:mm.");
  }
  const values = [...input.birthDate.split("-").map(Number), ...input.birthTime.split(":").map(Number)];
  const [year, month, day, hour, minute] = values;
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || hour > 23 || minute > 59) {
    throw new Error("birth date or time is invalid.");
  }
  return { year, month, day, hour, minute };
}

function compareParts(a: DateParts, b: DateParts): number {
  return [a.year - b.year, a.month - b.month, a.day - b.day, a.hour - b.hour, a.minute - b.minute].find((value) => value !== 0) ?? 0;
}

function subtractOneHour(parts: DateParts): DateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour - 1, parts.minute));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), hour: date.getUTCHours(), minute: date.getUTCMinutes() };
}

/** Applies the documented 1987–88 Korean KDT-to-KST conversion before library use. */
function applyKoreanDst(parts: DateParts, occurrence?: KoreanSajuInput["dstOccurrence"]): { parts: DateParts; adjusted: boolean } {
  const transitions: Record<number, { start: DateParts; end: DateParts }> = {
    1987: { start: { year: 1987, month: 5, day: 10, hour: 2, minute: 0 }, end: { year: 1987, month: 10, day: 11, hour: 2, minute: 0 } },
    1988: { start: { year: 1988, month: 5, day: 8, hour: 2, minute: 0 }, end: { year: 1988, month: 10, day: 9, hour: 2, minute: 0 } },
  };
  const transition = transitions[parts.year];
  if (!transition) return { parts, adjusted: false };

  if (compareParts(parts, transition.start) >= 0 && compareParts(parts, { ...transition.start, hour: 3 }) < 0) {
    throw new Error("This Korean DST start-hour birth time did not exist; ask the user to confirm the recorded time.");
  }
  if (parts.month === transition.end.month && parts.day === transition.end.day && parts.hour === 2) {
    if (!occurrence) throw new Error("This Korean DST end-hour birth time is ambiguous; dstOccurrence is required.");
    return occurrence === "daylight" ? { parts: subtractOneHour(parts), adjusted: true } : { parts, adjusted: false };
  }
  const daylightStart = { ...transition.start, hour: 3 };
  return compareParts(parts, daylightStart) >= 0 && compareParts(parts, transition.end) < 0
    ? { parts: subtractOneHour(parts), adjusted: true }
    : { parts, adjusted: false };
}

function toPillar(eightChar: EightChar, name: PillarName): MyeongsikPillar {
  const methods = PILLAR_METHODS[name];
  const values = methods.map((method) => (eightChar as unknown as Record<string, () => unknown>)[method]());
  const stringList = (value: unknown) => Array.isArray(value) ? value.map(String) : String(value || "").split("").filter(Boolean);
  return {
    ganZhi: String(values[0]), heavenlyStem: String(values[1]), earthlyBranch: String(values[2]),
    hiddenStems: stringList(values[3]), stemTenGod: String(values[4]),
    hiddenTenGods: stringList(values[5]), elementPair: String(values[6]),
  };
}

/** Converts the library result to the stable JSON contract owned by this service. */
export class KoreanPolicyAdapter {
  calculate(input: KoreanSajuInput): Myeongsik {
    const originalParts = parseDateTime(input);
    const timezone = input.timezone ?? "Asia/Seoul";
    if (timezone !== "Asia/Seoul") throw new Error("Step 1 currently supports Asia/Seoul only.");

    const dst = applyKoreanDst(originalParts, input.dstOccurrence);
    const { year, month, day, hour, minute } = dst.parts;
    const solar = input.calendar === "solar"
      ? Solar.fromYmdHms(year, month, day, hour, minute, 0)
      : Lunar.fromYmdHms(year, input.isLeapMonth ? -month : month, day, hour, minute, 0).getSolar();
    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();
    eightChar.setSect(2);
    const yun = eightChar.getYun(input.gender === "male" ? 1 : 0, 2);
    const daYun = yun.getDaYun(10).slice(1);
    const firstYear = daYun[0]?.getLiuNian() ?? [];

    return {
      version: 1,
      policy: { timezone, ziHour: "sect-2", solarTermBoundary: "exact-instant", koreanDstAdjusted: dst.adjusted, longitudeCorrection: "not-applied" },
      input: { calendar: input.calendar, isLeapMonth: input.isLeapMonth ?? false, localDateTime: `${input.birthDate} ${input.birthTime}:00`, timezone },
      lunarDate: lunar.toString(), dayMaster: eightChar.getDayGan(),
      pillars: { year: toPillar(eightChar, "year"), month: toPillar(eightChar, "month"), day: toPillar(eightChar, "day"), hour: toPillar(eightChar, "hour") },
      fortune: {
        direction: yun.isForward() ? "forward" : "backward", startsAt: yun.getStartSolar().toYmdHms(),
        daYun: daYun.map((period) => ({ ganZhi: period.getGanZhi(), startYear: period.getStartYear(), endYear: period.getEndYear() })),
        yearly: firstYear.map((period) => ({ year: period.getYear(), ganZhi: period.getGanZhi() })),
        monthly: firstYear[0]?.getLiuYue().map((period, index) => ({ ordinal: index + 1, ganZhi: period.getGanZhi() })) ?? [],
      },
      shinsal: { status: "pending-korean-rule-table", items: [] },
    };
  }
}
