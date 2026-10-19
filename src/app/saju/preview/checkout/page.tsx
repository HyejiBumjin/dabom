import Link from "next/link";
import { notFound } from "next/navigation";
import { SajuCheckout } from "@/components/SajuCheckout";
import { RetroPage, RetroWindow } from "@/components/RetroWindow";
import { CommerceFooter } from "@/components/CommerceFooter";
import { YEARLY_PRICE } from "@/lib/commerce/policy";

export default async function CheckoutPreviewPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { state } = await searchParams;
  const available = state !== "unavailable";

  return <RetroPage><RetroWindow title="다봄 · 올해 운세 받기" closeHref="/saju/library"><div className="retro-library">
    <Link className="retro-back-link" href="/saju/library">← 내 운세함</Link>
    <h1 className="retro-heading retro-checkout-heading">예시 인물님,<br />올해는 어떤 한 해가 될까?</h1>
    <p className="retro-form-help">디자인 확인용 예시야. 실제 구매 내역은 아니야.</p>
    <div className="retro-library-card"><p>나 · 여성 · 1995-05-20 · 양력 · 20:20</p><p className="retro-checkout-copy">대상 정보를 한 번 더 확인해줘.<br />같은 계정·출생 정보·연도의 운세는<br />내 운세함에서 추가 결제 없이 다시 읽어.</p></div>
    <p className="commerce-order-total">2026 올해 운세 1건 <strong>{YEARLY_PRICE.toLocaleString("ko-KR")}원</strong></p>
    <SajuCheckout profileId="preview-checkout" price={YEARLY_PRICE} available={available} />
  </div><CommerceFooter /></RetroWindow></RetroPage>;
}
