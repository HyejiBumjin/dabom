"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { RELATIONSHIPS, relationshipLabel, type Relationship } from "@/lib/saju/profile-input";
import { EmptyMailboxCat, PixelEnvelope } from "@/components/RetroWindow";
import { libraryPageHref, type LibraryFilter } from "@/lib/saju/library-page";

export type LibraryProfile = {
  id: string; name: string; relationship: Relationship; birthDate: string;
  birthTime: string | null; isLunar: boolean;
  historyHref?: string;
  reports: { id: string; year: string; status: string; paid: boolean }[];
};

function ReportLink({ href, preview, children }: { href: string; preview: boolean; children: ReactNode }) {
  return preview
    ? <div className="retro-library-report" aria-disabled="true">{children}</div>
    : <Link className="retro-library-report" href={href}>{children}</Link>;
}

export function SajuLibrary({ profiles, preview = false, pageFilter }: { profiles: LibraryProfile[]; preview?: boolean; pageFilter?: LibraryFilter }) {
  const [localFilter, setFilter] = useState<Relationship | "ALL">("ALL");
  const filter = pageFilter ?? localFilter;
  const visible = profiles.filter(profile => filter === "ALL" || profile.relationship === filter);
  return (
    <>
      {(profiles.some(profile => profile.relationship !== "SELF") || filter !== "ALL") && <div className="retro-library-filters" aria-label="기존 운세 분류 보기">
        {[{ value: "ALL" as const, label: "전체" }, ...RELATIONSHIPS].map(item => (
          pageFilter !== undefined
            ? <Link key={item.value} href={libraryPageHref(item.value)} prefetch={false} role="button" aria-pressed={filter === item.value}>{item.label}</Link>
            : <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}</button>
        ))}
      </div>}
      {visible.length === 0 ? (
        <div className="retro-library-empty"><EmptyMailboxCat /><p>{filter !== "ALL" ? "아직 이 분류로 보관한 운세는 없어." : "아직 도착한 메시지가 없어.\n너의 올해를 받아봐."}</p></div>
      ) : (
        <div className="retro-library-list">
          {visible.map(profile => (
            <section key={profile.id} className="retro-library-card" data-relationship={profile.relationship} aria-label={`${profile.name}의 운세`}>
              <div className="retro-library-card-bar" aria-hidden="true"><PixelEnvelope /><span>다봄의 메시지</span><span>✧</span></div>
              <div className="retro-library-card-body">
              <div className="retro-library-person"><h2>{profile.name}</h2>{profile.relationship !== "SELF" && <span>{relationshipLabel(profile.relationship)} · 기존 기록</span>}</div>
              <p className="retro-library-birth">{profile.birthDate.replaceAll("-", ".")} · {profile.isLunar ? "음력" : "양력"} · {profile.birthTime ?? "시각 모름"}</p>
              {profile.reports.length ? profile.reports.map(report => (
                <ReportLink key={report.id} preview={preview} href={`/saju/reports/${report.id}`}>
                  <span><strong>{report.year}년 올해 운세</strong><small>{report.status === "COMPLETED" ? report.paid ? "구매한 운세 · 추가 결제 없이 다시 보기" : "보관한 운세 다시 보기" : report.status === "FAILED" ? "메시지 준비 다시 이어가기" : "메시지 준비 중"}</small></span>
                  <span aria-hidden="true">→</span>
                </ReportLink>
              )) : <ReportLink preview={preview} href={`/saju/profiles/${profile.id}/checkout`}><span><strong>올해 운세 받기</strong><small>등록한 정보로 메시지를 준비할게.</small></span><span aria-hidden="true">→</span></ReportLink>}
              {profile.historyHref && <Link href={profile.historyHref} prefetch={false} className="retro-back-link">이전 메시지 더 보기 →</Link>}
              </div>
            </section>
          ))}
        </div>
      )}
      <Link href="/saju" className="retro-button">내 운세 메시지 받기</Link>
    </>
  );
}
