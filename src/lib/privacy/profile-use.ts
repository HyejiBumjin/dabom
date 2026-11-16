// Historical checkbox records only. New profile requests do not collect or
// fabricate acknowledgement/consent; the footer links to the published notice.
export const PROFILE_NOTICE_VERSION = "2026-10-28.5";
export const SELF_ONLY_MESSAGE = "지금은 본인의 운세만 신청할 수 있어. 가족·친구의 새 운세 신청은 준비 중이야.";
export const profileNoticeText = "만 14세 이상인 본인의 정보를 입력했으며, 운세 생성·보관과 국외 처리 안내를 확인했어요.";
export type ProfileNoticeRecord = { version: string; self: true; acceptedAt: string; text: string };
export function profileUseError(profile: { relationship?: string; privacyNotice?: ProfileNoticeRecord }) {
  if (profile.relationship !== "SELF") return SELF_ONLY_MESSAGE;
  return null;
}
