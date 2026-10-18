import Link from "next/link";
import type { ReactNode } from "react";
import { RetroPage, RetroWindow } from "@/components/RetroWindow";
import { CommerceFooter } from "@/components/CommerceFooter";
import { POLICY_EFFECTIVE_DATE, POLICY_VERSION } from "@/lib/commerce/policy";

export function CommercePage({ title, children, policy = false }: { title: string; children: ReactNode; policy?: boolean }) {
  return <RetroPage><RetroWindow title={`다봄 · ${title}`} closeHref="/">
    <article className="commerce-page">
      <Link href="/" className="retro-back-link">← 다봄으로</Link>
      <h1 className="retro-heading">{title}</h1>
      {policy && <p className="commerce-notice">{POLICY_EFFECTIVE_DATE ? `시행일 ${POLICY_EFFECTIVE_DATE}` : "정식 판매 전 검토 중인 정책 초안이야. 판매 시작 전에 확정된 내용을 안내할게."} · 버전 {POLICY_VERSION}</p>}
      {children}
    </article>
    <CommerceFooter />
  </RetroWindow></RetroPage>;
}
