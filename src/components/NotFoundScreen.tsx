"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RetroPage, RetroWindow } from "@/components/RetroWindow";
import { ExpressiveCat } from "@/components/ExpressiveCat";

export function NotFoundScreen() {
  useEffect(() => {
    const timer = setTimeout(() => window.location.replace("/"), 3500);
    return () => clearTimeout(timer);
  }, []);
  return <RetroPage><RetroWindow title="다봄 · 길을 찾는 중">
    <section className="retro-status" aria-labelledby="not-found-title">
      <ExpressiveCat mood="flustered" className="retro-cat-large" />
      <h1 id="not-found-title" className="retro-heading">앗, 주소를 찾지 못했어.</h1>
      <p className="retro-status-copy">잠시 뒤 메인 화면으로 이동할게.<br />거기서 다시 만나자.</p>
      <Link href="/" className="retro-button">지금 메인으로 가기</Link>
    </section>
  </RetroWindow></RetroPage>;
}
