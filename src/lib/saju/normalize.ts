import { createHash } from "crypto";
import type { FortuneInput } from "@/lib/fortune/types";
import type { NormalizedSajuInput } from "./types";

export function normalizeSajuInput(input: FortuneInput): NormalizedSajuInput {
  return {
    birthDate: input.birthDate,
    birthTime: input.birthTime || "모름",
    gender: input.gender || "",
    name: input.name || "",
    calendarType: input.calendarType || "solar",
    leapMonthType: input.leapMonthType || "regular",
  };
}

export function getSajuInputHash(input: NormalizedSajuInput): string {
  const seed = JSON.stringify(input);
  return createHash("sha256").update(seed).digest("hex");
}
