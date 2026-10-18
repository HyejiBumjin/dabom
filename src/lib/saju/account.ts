import { getFirebaseAccount } from "@/lib/firebase/auth";
import { redirect } from "next/navigation";
import { safeReturnPath } from "@/lib/auth-return-path";
import { canReadDevelopmentPreview, type PreviewReadableReport } from "@/lib/saju/report-preview-access";
import { allowsDevelopmentReports } from "@/lib/portone/payment-mode";

/** The verified login owns the library, independently of the subject of a report. */
export const getSajuAccount = getFirebaseAccount;

export async function requireSajuAccount(returnPath: string) {
  const account = await getSajuAccount();
  if (!account) redirect(`/login?next=${encodeURIComponent(safeReturnPath(returnPath))}`);
  return account;
}

export function canAccessSajuProfile(profile: { userId: string | null }, account: { id: string } | null) {
  return Boolean(account && profile.userId && profile.userId === account.id);
}

export function canReadSajuReport(report: PreviewReadableReport & { sajuProfile: { userId: string | null }; order: { userId: string; status: string } | null }, account: { id: string } | null, development = allowsDevelopmentReports()) {
  if (!canAccessSajuProfile(report.sajuProfile, account)) return false;
  return development || Boolean(account && (report.order?.userId === account.id && report.order.status === "PAID" || !report.order && canReadDevelopmentPreview(report, account.id)));
}
