import { z } from "zod";

export const RELATIONSHIPS = [
  { value: "SELF", label: "나" },
  { value: "FAMILY", label: "가족" },
  { value: "FRIEND", label: "친구" },
  { value: "PARTNER", label: "연인" },
  { value: "OTHER", label: "기타" },
] as const;

export type Relationship = typeof RELATIONSHIPS[number]["value"];
export const relationshipLabel = (value: string) => RELATIONSHIPS.find(item => item.value === value)?.label ?? "기타";
export const SAJU_PRODUCT_CODE = "yearly_2026";
export const SAJU_REPORT_YEAR = 2026;

export const profileInputSchema = z.object({
  name: z.string().trim().min(1).max(40).refine(value => !/[\p{Cc}\p{Cf}]/u.test(value), "이름에 제어 문자를 넣을 수 없어."),
  relationship: z.enum(["SELF", "FAMILY", "FRIEND", "PARTNER", "OTHER"]).default("SELF"),
  gender: z.enum(["male", "female"]),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(`${value}T00:00:00.000Z`);
    return year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31
      && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "유효한 생년월일을 입력해줘."),
  birthTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable(),
  calendar: z.enum(["solar", "lunar"]),
  isLeapMonth: z.boolean(),
}).transform(input => ({ ...input, isLeapMonth: input.calendar === "lunar" && input.isLeapMonth }));

export type ProfileInput = z.output<typeof profileInputSchema>;
