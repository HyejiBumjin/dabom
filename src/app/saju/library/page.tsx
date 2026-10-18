import Link from "next/link";
import { firebaseStore } from "@/lib/firebase/store";
import { requireSajuAccount } from "@/lib/saju/account";
import { SajuLibrary, type LibraryProfile } from "@/components/SajuLibrary";
import { RetroFooter, RetroPage, RetroWindow } from "@/components/RetroWindow";
import { AccountPrivacyBoundary } from "@/components/AccountPrivacyBoundary";
import { libraryFilter, libraryPageHref, libraryHistoryHref } from "@/lib/saju/library-page";
import { enforceAccountRateLimit } from "@/lib/security/rate-limit";

export default async function SajuLibraryPage({ searchParams }: { searchParams: Promise<{ after?: string; relationship?: string; profile?: string; historyAfter?: string }> }) {
  const account = await requireSajuAccount("/saju/library");
  await enforceAccountRateLimit(account.id, "library-read", 12, 60_000);
  const params = await searchParams;
  const filter = libraryFilter(params.relationship);
  const { profiles, nextCursor } = await firebaseStore.listLibraryPage(account.id, { after: typeof params.after === "string" ? params.after : undefined, relationship: filter, profile: typeof params.profile === "string" ? params.profile : undefined, historyAfter: typeof params.historyAfter === "string" ? params.historyAfter : undefined });
  const cards: LibraryProfile[] = profiles.map(profile => ({ id: profile.id, name: profile.name, relationship: profile.relationship, birthTime: profile.birthTime, isLunar: profile.isLunar, birthDate: profile.birthDate.toISOString().slice(0, 10), historyHref: profile.nextReportCursor ? libraryHistoryHref(profile.id, profile.nextReportCursor) : undefined, reports: profile.reports.map(report => ({ id: report.id, year: report.productCode.match(/\d{4}/)?.[0] ?? "2026", status: report.status, paid: report.order?.status === "PAID" })) }));
  return (
    <AccountPrivacyBoundary key={account.id} accountId={account.id} returnPath="/saju/library"><RetroPage><RetroWindow title="다봄 · 내 운세함" closeHref="/">
      <div className="retro-library">
        <Link href="/" className="retro-back-link">← 처음으로</Link>
        <header className="retro-input-heading"><div><h1 className="retro-heading">내 운세함</h1><p>너와 소중한 사람에게 온 메시지.</p></div></header>
        <SajuLibrary profiles={cards} pageFilter={filter} />
        {(params.after || params.profile || nextCursor) && <nav className="flex flex-wrap justify-center gap-5 py-5 text-sm" aria-label="운세함 페이지">
          {(params.after || params.profile) && <Link href={libraryPageHref(filter)} prefetch={false}>처음 목록으로</Link>}
          {nextCursor && <Link href={libraryPageHref(filter, nextCursor)} prefetch={false}>다음 목록 보기 →</Link>}
        </nav>}
        <RetroFooter />
      </div>
    </RetroWindow></RetroPage></AccountPrivacyBoundary>
  );
}
