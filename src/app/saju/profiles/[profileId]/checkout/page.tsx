import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { firebaseStore } from "@/lib/firebase/store";
import { env } from "@/lib/env";
import { requireSajuAccount, canReadSajuReport } from "@/lib/saju/account";
import { SAJU_PRODUCT_CODE, relationshipLabel } from "@/lib/saju/profile-input";
import { ensureSajuReport } from "@/lib/saju/library-service";
import { SajuCheckout } from "@/components/SajuCheckout";
import { RetroPage, RetroWindow } from "@/components/RetroWindow";
import { CommerceFooter } from "@/components/CommerceFooter";
import { isCommerceReady, YEARLY_PRICE } from "@/lib/commerce/policy";
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
  const testMode = isPaymentTestMode();
  const available = Boolean(product?.active && product.price === YEARLY_PRICE && (testMode || isCommerceReady()) && env.NEXT_PUBLIC_PORTONE_STORE_ID && env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY && env.PORTONE_API_SECRET && env.PORTONE_WEBHOOK_SECRET);
  return <AccountPrivacyBoundary key={account.id} accountId={account.id} returnPath={`/saju/profiles/${profileId}/checkout`}>
    <RetroPage><RetroWindow title="다봄 · 올해 운세 받기" closeHref="/saju/library">
      <div className="retro-library">
        <Link className="retro-back-link" href="/saju/library">← 내 운세함</Link>
        <h1 className="retro-heading retro-checkout-heading">{profile.name}에게 온<br />2026년의 메시지</h1>
        <div className="retro-library-card">
          <p>{relationshipLabel(profile.relationship)} · {profile.gender === "FEMALE" ? "여성" : "남성"}</p>
          <p>{profile.birthDate.toISOString().slice(0,10)} · {profile.isLunar ? `음력${profile.isLeapMonth ? " (윤달)" : ""}` : "양력"} · {profile.birthTime ?? "시각 모름"}</p>
          <p className="retro-checkout-copy">대상 정보를 한 번 더 확인해줘.<br />같은 계정·출생 정보·연도의 운세는<br />내 운세함에서 추가 결제 없이 다시 읽어.</p>
        </div>
        <p className="commerce-order-total">2026 올해 운세 1건 <strong>{YEARLY_PRICE.toLocaleString("ko-KR")}원</strong></p>
        <SajuCheckout profileId={profile.id} price={YEARLY_PRICE} available={available} testMode={testMode} />
      </div>
      <CommerceFooter />
    </RetroWindow></RetroPage>
  </AccountPrivacyBoundary>;
}
