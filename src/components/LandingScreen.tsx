import Link from "next/link";
import type { ReactNode } from "react";
import { SkyMessenger, RetroPage, RetroWindow } from "@/components/RetroWindow";
import { TypewrittenText } from "@/components/RetroMotion";
import { CommerceFooter } from "@/components/CommerceFooter";
import { YEARLY_PRICE } from "@/lib/commerce/policy";

export function LandingScreen({ loggedIn, accountNav }: { loggedIn: boolean; accountNav: ReactNode }) {
  return (
    <RetroPage>
      <RetroWindow title="다봄 · 올해의 메시지">
        <div className="retro-home">
          <h1 className="retro-heading"><TypewrittenText text={"2026년의 너에게,\n다봄이 보낸 메시지."} /></h1>
          <p className="retro-home-copy">조금 찔리고, 조금 웃기고.<br />은근히 내 편인 올해 운세.</p>
          <SkyMessenger />
          <Link href="/saju" className="retro-button">내 운세 메시지 받기</Link>
          <Link href="/yearly" className="commerce-home-link"><span className="commerce-home-product">2026 올해 운세</span><strong className="commerce-home-price">{YEARLY_PRICE.toLocaleString("ko-KR")}원</strong><span>어떤 메시지인지 먼저 보기</span></Link>
          {loggedIn && <Link href="/saju/library" className="retro-back-link">내 운세함 <span aria-hidden="true">→</span></Link>}
          <div className="retro-account-nav">{accountNav}</div>
        </div>
        <CommerceFooter />
      </RetroWindow>
    </RetroPage>
  );
}
