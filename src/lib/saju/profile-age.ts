import "server-only";
import { birthDateEligibilityError, INVALID_BIRTH_DATE_MESSAGE } from "./age-policy";
import { RequestSecurityError } from "@/lib/security/request";

type StoredBirth = { birthDate: Date; isLunar: boolean; isLeapMonth: boolean };
export function storedProfileAgeError(profile: StoredBirth, now = new Date()) {
  if (!(profile.birthDate instanceof Date) || !Number.isFinite(profile.birthDate.getTime())) return INVALID_BIRTH_DATE_MESSAGE;
  return birthDateEligibilityError({ birthDate: profile.birthDate.toISOString().slice(0, 10), calendar: profile.isLunar ? "lunar" : "solar", isLeapMonth: profile.isLeapMonth }, now);
}
export function assertProfileAge(profile: StoredBirth) {
  const error = storedProfileAgeError(profile);
  if (error) throw new RequestSecurityError(400, error);
}
