import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { firebaseStore } from "@/lib/firebase/store";
import { env } from "@/lib/env";
import { requireSajuAccount, canReadSajuReport } from "@/lib/saju/account";
import { SAJU_PRODUCT_CODE, relationshipLabel } from "@/lib/saju/profile-input";
import { ensureSajuReport } from "@/lib/saju/library-service";
import { SajuCheckout } from "@/components/SajuCheckout";
import { RetroFooter, RetroPage, RetroWindow } from "@/components/RetroWindow";
import { AccountPrivacyBoundary } from "@/components/AccountPrivacyBoundary";
import { isPaymentTestMode } from "@/lib/portone/payment-mode";

export default async function SajuCheckoutPage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  const account = await requireSajuAccount(`/saju/profiles/${profileId}/checkout`);
  const profile = await firebaseStore.getProfile(profileId);
  if (!profile || profile.userId !== account.id) notFound();
  const existing = await firebaseStore.getReportWithAccess(firebaseStore.reportId(profile.id, SAJU_PRODUCT_CODE));
  if (existing && canReadSajuReport(existing, account)) redirect(`/saju/reports/${existing.id}`);
  const paid = await firebaseStore.getOrder(firebaseStore.orderId(account.id, profile.id, SAJU_PRODUCT_CODE));
  if (paid?.status === "PAID" && paid.userId === account.id) { const report = await ensureSajuReport(account.id, profile.id, paid.id); redirect(`/saju/reports/${report.id}`); }
  const product = await firebaseStore.getProduct(SAJU_PRODUCT_CODE);
  const available = Boolean(product?.active && env.NEXT_PUBLIC_PORTONE_STORE_ID && env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY && env.PORTONE_API_SECRET && env.PORTONE_WEBHOOK_SECRET);
  return <AccountPrivacyBoundary key={account.id} accountId={account.id} returnPath={`/saju/profiles/${profileId}/checkout`}><RetroPage><RetroWindow title="다봄 · 올해 운세 받기" closeHref="/saju/library"><div className="retro-library"><Link className="retro-back-link" href="/saju/library">← 내 운세함</Link><h1 className="retro-heading retro-checkout-heading">{profile.name}에게 온<br />2026년의 메시지</h1><div className="retro-library-card"><p>{relationshipLabel(profile.relationship)} · {profile.birthDate.toISOString().slice(0,10)} · {profile.birthTime ?? "시각 모름"}</p><p className="retro-checkout-copy">올해의 흐름을 다봄의 긴 메시지로 받아봐.<br />한 번 구매한 운세는 내 운세함에 보관돼.<br />같은 정보·같은 연도는 다시 결제할 필요 없어.</p></div><SajuCheckout profileId={profile.id} price={product?.price ?? 0} available={available} testMode={isPaymentTestMode()} /><RetroFooter /></div></RetroWindow></RetroPage></AccountPrivacyBoundary>;
}
