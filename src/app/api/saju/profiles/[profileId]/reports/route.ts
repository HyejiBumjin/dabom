import { NextResponse } from "next/server";
import { firebaseStore } from "@/lib/firebase/store";
import { getSajuAccount, canAccessSajuProfile, canReadSajuReport } from "@/lib/saju/account";
import { SAJU_PRODUCT_CODE } from "@/lib/saju/profile-input";
import { ensureSajuReport } from "@/lib/saju/library-service";
import { guardedMutation } from "@/lib/security/request";
import { enforceAccountRateLimit } from "@/lib/security/rate-limit";
import { allowsDevelopmentReports } from "@/lib/portone/payment-mode";

export async function POST(request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  return guardedMutation(request, async () => {
  const { profileId } = await params;
  const account = await getSajuAccount();
  if (!account) return NextResponse.json({ error: "로그인이 필요해." }, { status: 401 });
  const profile = await firebaseStore.getProfile(profileId);
  if (!profile || !canAccessSajuProfile(profile, account)) return NextResponse.json({ error: "사주 정보를 찾을 수 없습니다." }, { status: 404 });
  await enforceAccountRateLimit(account.id, "report-create", 20, 3_600_000);

  const existing = await firebaseStore.getReportWithAccess(firebaseStore.reportId(profile.id, SAJU_PRODUCT_CODE));
  if (existing && canReadSajuReport(existing, account)) return NextResponse.json({ reportId: existing.id, existing: true });

  if (!allowsDevelopmentReports()) return NextResponse.json({ error: "처음 받는 올해 운세는 결제가 필요해.", checkoutUrl: `/saju/profiles/${profileId}/checkout` }, { status: 402 });
  const report = await ensureSajuReport(account.id, profile.id);
  return NextResponse.json({ reportId: report.id, existing: false }, { status: 201 });
  });
}
