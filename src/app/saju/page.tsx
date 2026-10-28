import { accountScope } from "@/lib/account-scope";
import Link from "next/link";
import { SajuProfileForm } from "@/components/SajuProfileForm";
import { RetroFooter, RetroPage, RetroWindow } from "@/components/RetroWindow";
import { ExpressiveCat } from "@/components/ExpressiveCat";
import { requireSajuAccount } from "@/lib/saju/account";
import { AccountPrivacyBoundary } from "@/components/AccountPrivacyBoundary";

export default async function SajuInputPage() {
  const account = await requireSajuAccount("/saju");
  return (
    <AccountPrivacyBoundary key={accountScope(account)} accountId={accountScope(account)} returnPath="/saju"><RetroPage>
      <RetroWindow title="다봄 · 내 정보" closeHref="/">
        <div className="retro-input-page">
          <Link href="/" className="retro-back-link">← 처음으로</Link>
          <Link href="/saju/library" className="retro-input-library-link">내 운세함 →</Link>
          <header className="retro-input-heading">
            <div>
              <h1 className="retro-heading">너의 시작을 알려줘.</h1>
              <p>올해의 메시지를 준비할게.</p>
            </div>
            <ExpressiveCat mood="curious" />
          </header>
          <SajuProfileForm accountId={accountScope(account)} />
          <RetroFooter />
        </div>
      </RetroWindow>
    </RetroPage></AccountPrivacyBoundary>
  );
}
