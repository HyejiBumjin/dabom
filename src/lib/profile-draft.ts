import { profileInputSchema } from "@/lib/saju/profile-input";

export const PROFILE_DRAFT_KEY = "dabom-profile-draft";

/** A late response from a previous login cannot restore its input for another account. */
export function restoreProfileDraft(raw: string | null, accountId: string) {
  if (!raw || !accountId) return null;
  try {
    const saved = JSON.parse(raw) as { accountId?: unknown; input?: unknown } | null;
    if (!saved || saved.accountId !== accountId) return null;
    const parsed = profileInputSchema.safeParse(saved.input);
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
