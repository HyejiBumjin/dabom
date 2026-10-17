import { notFound } from "next/navigation";
import { SajuLibrary, type LibraryProfile } from "@/components/SajuLibrary";
import { CloudCat, RetroFooter, RetroPage, RetroWindow } from "@/components/RetroWindow";

const previewProfiles: LibraryProfile[] = [
  { id: "preview-self", name: "나", relationship: "SELF", birthDate: "1995-05-20", birthTime: "20:20", isLunar: false, reports: [{ id: "preview-self-report", year: "2026", status: "COMPLETED", paid: true }] },
  { id: "preview-family", name: "엄마", relationship: "FAMILY", birthDate: "1968-08-12", birthTime: null, isLunar: true, reports: [{ id: "preview-family-report", year: "2026", status: "COMPLETED", paid: true }] },
  { id: "preview-friend", name: "친구", relationship: "FRIEND", birthDate: "1996-04-03", birthTime: "10:00", isLunar: false, reports: [{ id: "preview-friend-report", year: "2026", status: "COMPLETED", paid: true }] },
  { id: "preview-partner", name: "연인", relationship: "PARTNER", birthDate: "1994-11-18", birthTime: "08:30", isLunar: false, reports: [{ id: "preview-partner-report", year: "2026", status: "PENDING", paid: true }] },
];

export default function LibraryPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <RetroPage><RetroWindow title="다봄 · 운세함 미리보기" closeHref="/saju/library"><div className="retro-library"><header className="retro-input-heading"><div><h1 className="retro-heading">내 운세함</h1><p>너와 소중한 사람에게 온 메시지.</p></div><CloudCat /></header><p className="retro-form-help">디자인 확인용 예시야. 실제 구매 내역은 아니야.</p><SajuLibrary profiles={previewProfiles} preview /><RetroFooter /></div></RetroWindow></RetroPage>;
}
