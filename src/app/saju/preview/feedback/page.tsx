import Link from "next/link";
import { notFound } from "next/navigation";
import { LandingScreen } from "@/components/LandingScreen";
import { TopNav } from "@/components/TopNav";
import { RetroFooter, RetroPage, RetroWindow } from "@/components/RetroWindow";
import { SajuLibrary } from "@/components/SajuLibrary";
import { FeedbackStatePreview } from "./FeedbackStatePreview";

/** Shared production UI with synthetic state; never calls payment or report APIs. */
export default async function FeedbackPreview({ searchParams }: { searchParams: Promise<{ case?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { case: screen } = await searchParams;
  if (screen === "home-guest") return <LandingScreen loggedIn={false} accountNav={<TopNav />} />;
  return <RetroPage><RetroWindow title="다봄 · 화면 미리보기" closeHref="/">
    <p className="retro-preview-note">디자인 확인을 위해 재현한 화면이야.</p>
    {screen === "empty-library" ? <div className="retro-library"><header className="retro-input-heading"><div><h1 className="retro-heading">내 운세함</h1><p>너와 소중한 사람에게 온 메시지.</p></div></header><SajuLibrary profiles={[]} preview /><RetroFooter /></div>
      : screen === "duplicate" || screen === "failed" || screen === "access" || screen === "login" ? <FeedbackStatePreview screen={screen} />
      : <nav className="retro-status">{["home-guest", "duplicate", "failed", "access", "login", "empty-library"].map(value => <p key={value}><Link href={`/saju/preview/feedback?case=${value}`}>{value}</Link></p>)}</nav>}
  </RetroWindow></RetroPage>;
}
