import { Lunar } from "lunar-javascript";

export const MINIMUM_REPORT_AGE = 14;
export const MINIMUM_AGE_MESSAGE = "만 14세 이상인 본인의 운세만 받을 수 있어.";
export const INVALID_BIRTH_DATE_MESSAGE = "생년월일과 양력·음력·윤달 여부를 다시 확인해줘.";
type BirthInput = { birthDate: string; calendar: "solar" | "lunar"; isLeapMonth: boolean };

/** Compare calendar birthdays, not nominal Korean age or the report's year. */
export function birthDateEligibilityError(input: BirthInput, now = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate) || !Number.isFinite(now.getTime())) return INVALID_BIRTH_DATE_MESSAGE;
  const [year, month, day] = input.birthDate.split("-").map(Number);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return INVALID_BIRTH_DATE_MESSAGE;
  // Keep the input date range supported by KoreanPolicyAdapter unchanged.
  const date = new Date(`${input.birthDate}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.birthDate) return INVALID_BIRTH_DATE_MESSAGE;
  let solarBirthday = input.birthDate;
  try {
    if (input.calendar === "lunar") solarBirthday = Lunar.fromYmdHms(year, input.isLeapMonth ? -month : month, day, 12, 0, 0).getSolar().toYmd();
  } catch { return INVALID_BIRTH_DATE_MESSAGE; }
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(value => value.type === type)!.value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  if (solarBirthday > today) return "미래 날짜는 생년월일로 입력할 수 없어.";
  const [birthYear, birthMonth, birthDay] = solarBirthday.split("-").map(Number);
  const age = Number(part("year")) - birthYear - (Number(part("month")) * 100 + Number(part("day")) < birthMonth * 100 + birthDay ? 1 : 0);
  return age < MINIMUM_REPORT_AGE ? MINIMUM_AGE_MESSAGE : null;
}
