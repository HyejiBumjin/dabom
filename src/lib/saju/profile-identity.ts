import { Lunar } from "lunar-javascript";

type Identity = { name: string; birthDate: Date; isLunar: boolean; isLeapMonth: boolean };
/** Duplicate purchase key only. A name and birthday do not authenticate a person. */
export function profileIdentityParts(input: Identity) {
  const date = input.birthDate.toISOString().slice(0, 10);
  const [year, month, day] = date.split("-").map(Number);
  const solar = input.isLunar ? Lunar.fromYmdHms(year, input.isLeapMonth ? -month : month, day, 12, 0, 0).getSolar().toYmd() : date;
  return [input.name.normalize("NFKC").replace(/\s+/gu, "").toLocaleLowerCase("ko-KR"), solar];
}
export function sameProfileIdentity(a: Identity, b: Identity) {
  try { return JSON.stringify(profileIdentityParts(a)) === JSON.stringify(profileIdentityParts(b)); }
  catch { return false; } // Malformed legacy records never broaden a match.
}
