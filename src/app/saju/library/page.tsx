import Link from "next/link";
import { firebaseStore } from "@/lib/firebase/store";
import { requireSajuAccount } from "@/lib/saju/account";
import { SajuLibrary, type LibraryProfile } from "@/components/SajuLibrary";
import { CloudCat, RetroFooter, RetroPage, RetroWindow } from "@/components/RetroWindow";
import { AccountPrivacyBoundary } from "@/components/AccountPrivacyBoundary";

export default async function SajuLibraryPage() {
  const account = await requireSajuAccount("/saju/library");
  const profiles = await firebaseStore.listLibrary(account.id);
  const cards: LibraryProfile[] = profiles.map(profile => ({ id: profile.id, name: profile.name, relationship: profile.relationship, birthTime: profile.birthTime, isLunar: profile.isLunar, birthDate: profile.birthDate.toISOString().slice(0, 10), reports: profile.reports.map(report => ({ id: report.id, year: report.productCode.match(/\d{4}/)?.[0] ?? "2026", status: report.status, paid: report.order?.status === "PAID" })) }));
  return (
    <AccountPrivacyBoundary key={account.id} accountId={account.id} returnPath="/saju/library"><RetroPage><RetroWindow title="다봄 · 내 운세함" closeHref="/">
      <div className="retro-library">
        <Link href="/" className="retro-back-link">← 처음으로</Link>
        <header className="retro-input-heading"><div><h1 className="retro-heading">내 운세함</h1><p>너와 소중한 사람에게 온 메시지.</p></div><CloudCat /></header>
        <SajuLibrary profiles={cards} />
        <RetroFooter />
      </div>
    </RetroWindow></RetroPage></AccountPrivacyBoundary>
  );
}
