"use client";

import { useEffect, useRef, useState } from "react";
import { ExistingFortuneNotice } from "@/components/ExistingFortuneNotice";
import { ReportErrorState } from "@/components/ReportErrorState";
import { RetroTitleBar } from "@/components/RetroWindow";

export function FeedbackStatePreview({ screen }: { screen: "duplicate" | "failed" | "access" | "login" }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState("");
  useEffect(() => { if (screen === "duplicate") dialog.current?.showModal(); }, [screen]);
  if (screen !== "duplicate") return <><ReportErrorState kind={screen} onRetry={() => setMessage("디자인 미리보기에서는 리포트를 생성하지 않아.")} /><p role="status" className="retro-preview-note">{message}</p></>;
  return <div className="retro-status"><button type="button" className="retro-button" onClick={() => dialog.current?.showModal()}>중복 안내 보기</button>
    <dialog ref={dialog} className="retro-window retro-duplicate-dialog" aria-labelledby="duplicate-fortune-title" aria-describedby="duplicate-fortune-description">
      <RetroTitleBar title="다봄 · 알림"><button type="button" className="retro-window-close" aria-label="미리보기 닫기" onClick={() => dialog.current?.close()}>×</button></RetroTitleBar>
      <ExistingFortuneNotice pending={false} onLibrary={() => dialog.current?.close()} onNewQuery={() => dialog.current?.close()} />
    </dialog>
  </div>;
}
