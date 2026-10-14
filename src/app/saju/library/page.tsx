import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSajuAccount } from "@/lib/saju/account";
import { SajuLibrary, type LibraryProfile } from "@/components/SajuLibrary";
import { PixelCat, RetroFooter, RetroPage, RetroWindow } from "@/components/RetroWindow";
import { AccountPrivacyBoundary } from "@/components/AccountPrivacyBoundary";

export default async function SajuLibraryPage() {
  const account = await requireSajuAccount("/saju/library");
  const profiles = await prisma.sajuProfile.findMany({
    where: { userId: account.id }, orderBy: { createdAt: "desc" },
    select: { id: true, name: true, relationship: true, birthDate: true, birthTime: true, isLunar: true,
      reports: { where: process.env.NODE_ENV === "development" ? {} : { order: { is: { userId: account.id, status: "PAID" } } }, orderBy: { createdAt: "desc" }, select: { id: true, productCode: true, status: true, order: { select: { status: true } } } },
    },
  });
  const cards: LibraryProfile[] = profiles.map(profile => ({ ...profile, birthDate: profile.birthDate.toISOString().slice(0, 10), reports: profile.reports.map(report => ({ id: report.id, year: report.productCode.match(/\d{4}/)?.[0] ?? "2026", status: report.status, paid: report.order?.status === "PAID" })) }));
  return (
    <AccountPrivacyBoundary key={account.id} accountId={account.id} returnPath="/saju/library"><RetroPage><RetroWindow title="다봄 · 내 운세함" closeHref="/">
      <div className="retro-library">
        <Link href="/" className="retro-back-link">← 처음으로</Link>
        <header className="retro-input-heading"><div><h1 className="retro-heading">내 운세함</h1><p>너와 소중한 사람에게 온 메시지.<br />구매한 올해 운세는 언제든 다시 읽어.</p></div><PixelCat letter /></header>
        <SajuLibrary profiles={cards} />
        <RetroFooter />
      </div>
    </RetroWindow></RetroPage></AccountPrivacyBoundary>
  );
}
