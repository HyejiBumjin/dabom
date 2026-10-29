import { z } from "zod";

export const PROFILE_NOTICE_VERSION = "2026-10-28.5";
export const SELF_ONLY_MESSAGE = "지금은 본인의 운세만 신청할 수 있어. 가족·친구의 새 운세 신청은 준비 중이야.";
export const PROFILE_NOTICE_MESSAGE = "입력 화면에서 본인 정보와 개인정보 처리 안내를 다시 확인해줘.";
export const profileNoticeText = "만 14세 이상인 본인의 정보를 입력했으며, 운세 생성·보관과 국외 처리 안내를 확인했어요.";
// An acknowledgement of the subject and notice, NOT verified identity or a
// proxy's consent on behalf of somebody else. Necessary processing is disclosed
// under the contract basis separately from optional processing consent.
export const profileNoticeSchema = z.object({ version: z.literal(PROFILE_NOTICE_VERSION), self: z.literal(true) }).strict();
export type ProfileNoticeRecord = z.infer<typeof profileNoticeSchema> & { acceptedAt: string; text: string };
export function profileUseError(profile: { relationship?: string; privacyNotice?: ProfileNoticeRecord }) {
  if (profile.relationship !== "SELF") return SELF_ONLY_MESSAGE;
  if (!profile.privacyNotice || !profileNoticeSchema.safeParse({ version: profile.privacyNotice.version, self: profile.privacyNotice.self }).success || !Number.isFinite(Date.parse(profile.privacyNotice.acceptedAt))) return PROFILE_NOTICE_MESSAGE;
  return null;
}
