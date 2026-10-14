import { notFound } from "next/navigation";
import { ReportPreparing, RetroPage, RetroWindow } from "@/components/RetroWindow";

/** Preview the actual report layout without starting a paid generation. */
export default function RetroLoadingPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <RetroPage>
      <RetroWindow title="다봄과의 대화" closeHref="/saju">
        <ReportPreparing />
      </RetroWindow>
    </RetroPage>
  );
}
