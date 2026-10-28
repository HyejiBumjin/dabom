import { accountScope } from "@/lib/account-scope";
import { EssayReportView } from "@/components/EssayReportView";
import { RetroPage, RetroWindow } from "@/components/RetroWindow";
import { notFound, redirect } from "next/navigation";
import { firebaseStore } from "@/lib/firebase/store";
import { requireSajuAccount, canReadSajuReport, canAccessSajuProfile } from "@/lib/saju/account";
import { AccountPrivacyBoundary } from "@/components/AccountPrivacyBoundary";

export default async function SajuReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const account = await requireSajuAccount(`/saju/reports/${reportId}`);
  const report = await firebaseStore.getReportWithAccess(reportId);
  if (!report || !canAccessSajuProfile(report.sajuProfile, account)) notFound();
  if (!canReadSajuReport(report, account)) redirect(`/saju/profiles/${report.sajuProfileId}/checkout`);
  return (
    <AccountPrivacyBoundary key={accountScope(account)} accountId={accountScope(account)} returnPath={`/saju/reports/${reportId}`}><RetroPage>
      <RetroWindow title="다봄" closeHref="/saju" closeLabel="새 운세 정보 입력하기">
        <h1 className="sr-only">너에게 온 올해 운세</h1>
        <EssayReportView key={reportId} reportId={reportId} />
      </RetroWindow>
    </RetroPage></AccountPrivacyBoundary>
  );
}
