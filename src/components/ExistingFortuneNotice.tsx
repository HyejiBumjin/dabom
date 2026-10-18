import type { Ref } from "react";
import { SavedFortuneCat } from "@/components/RetroWindow";
import { SAJU_REPORT_YEAR } from "@/lib/saju/profile-input";

export function ExistingFortuneNotice({ pending, onLibrary, onNewQuery, libraryButton }: {
  pending: boolean; onLibrary: () => void; onNewQuery: () => void; libraryButton?: Ref<HTMLButtonElement>;
}) {
  return <div className="retro-window-body retro-duplicate-body">
    <SavedFortuneCat />
    <h2 className="retro-heading" id="duplicate-fortune-title">이미 조회한 운세가 있어.</h2>
    <p id="duplicate-fortune-description">같은 정보로 조회한 {SAJU_REPORT_YEAR}년 운세가<br />내 운세함에 보관돼 있어.</p>
    <p className="retro-duplicate-note">다시 결제하지 않고 확인할 수 있어.</p>
    <div className="retro-duplicate-actions">
      <button ref={libraryButton} type="button" className="retro-button" disabled={pending} onClick={onLibrary}>{pending ? "운세함으로 이동 중…" : "내 운세함으로 이동"}</button>
      <button type="button" className="retro-button retro-button--secondary" disabled={pending} onClick={onNewQuery}>새로운 정보 입력</button>
    </div>
  </div>;
}
