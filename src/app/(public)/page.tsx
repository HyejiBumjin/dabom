import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { SkyMessenger, RetroFooter, RetroPage, RetroWindow } from "@/components/RetroWindow";
import { TypewrittenText } from "@/components/RetroMotion";
import { getSajuAccount } from "@/lib/saju/account";
import { AccountPrivacyBoundary } from "@/components/AccountPrivacyBoundary";

export default async function LandingPage() {
  const account = await getSajuAccount();

  return (
    <RetroPage>
      <RetroWindow title="다봄 · 올해의 메시지">
        <div className="retro-home">
          <h1 className="retro-heading"><TypewrittenText text={"2026년의 너에게,\n다봄이 보낸 메시지."} /></h1>
          <p className="retro-home-copy">조금 찔리고, 조금 웃기고.<br />은근히 내 편인 올해 운세.</p>
          <SkyMessenger />
          <Link href="/saju" className="retro-button">내 운세 메시지 받기 <span aria-hidden="true">→</span></Link>
          <p className="retro-caption">생년월일과 태어난 시각을 알려줘.</p>
          <Link href="/saju/library" className="retro-back-link">내 운세함 <span aria-hidden="true"> →</span></Link>
          <div className="retro-account-nav">{account ? <AccountPrivacyBoundary key={account.id} accountId={account.id} returnPath="/" compact><TopNav userEmail={account?.email ?? null} loggedIn showLibraryLink={false} /></AccountPrivacyBoundary> : <TopNav />}</div>
        </div>
        <RetroFooter />
      </RetroWindow>
    </RetroPage>
  );
}
