import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { PixelCat, RetroFooter, RetroPage, RetroWindow } from "@/components/RetroWindow";
import { TypewrittenText } from "@/components/RetroMotion";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { AccountPrivacyBoundary } from "@/components/AccountPrivacyBoundary";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await (supabase?.auth.getUser() ?? { data: { user: null } });
  const account = user && !user.is_anonymous ? await prisma.user.findUnique({ where: { kakaoId: user.id }, select: { id: true } }) : null;

  return (
    <RetroPage>
      <RetroWindow title="다봄">
        <div className="retro-home">
          <p className="retro-badge">2026년 올해 운세</p>
          <h1 className="retro-heading"><TypewrittenText text={"2026년의 너에게,\n다봄이 보낸 메시지."} /></h1>
          <p className="retro-home-copy">조금 찔리고, 조금 웃기고.<br />은근히 내 편인 올해 운세.</p>
          <PixelCat className="retro-cat-large" letter />
          <p className="retro-bubble">너의 올해는 어떤 흐름일까?</p>
          <Link href="/saju" className="retro-button">내 운세 메시지 받기 <span aria-hidden="true">→</span></Link>
          <p className="retro-caption">생년월일과 태어난 시각을 알려줘.</p>
          <RetroFooter />
          <Link href="/saju/library" className="retro-back-link">내 운세함 <span aria-hidden="true"> →</span></Link>
          <div className="retro-account-nav">{account ? <AccountPrivacyBoundary key={account.id} accountId={account.id} returnPath="/" compact><TopNav userEmail={user?.email ?? null} loggedIn /></AccountPrivacyBoundary> : <TopNav />}</div>
        </div>
      </RetroWindow>
    </RetroPage>
  );
}
