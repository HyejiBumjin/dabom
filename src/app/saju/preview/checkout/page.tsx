import Link from "next/link";
import { notFound } from "next/navigation";
import { SajuCheckout } from "@/components/SajuCheckout";
import { RetroFooter, RetroPage, RetroWindow } from "@/components/RetroWindow";

export default async function CheckoutPreviewPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { state } = await searchParams;
  const available = state !== "unavailable";

  return <RetroPage><RetroWindow title="다봄 · 올해 운세 받기" closeHref="/saju/library"><div className="retro-library"><Link className="retro-back-link" href="/saju/library">← 내 운세함</Link><h1 className="retro-heading retro-checkout-heading">최혜지에게 온<br />2026년의 메시지</h1><p className="retro-form-help">디자인 확인용 예시야. 실제 구매 내역은 아니야.</p><div className="retro-library-card"><p>나 · 1995-05-20 · 20:20</p><p className="retro-checkout-copy">올해의 흐름을 다봄의 긴 메시지로 받아봐.<br />한 번 구매한 운세는 내 운세함에 보관돼.<br />같은 정보·같은 연도는 다시 결제할 필요 없어.</p></div><SajuCheckout profileId="preview-checkout" price={3900} available={available} /><RetroFooter /></div></RetroWindow></RetroPage>;
}
