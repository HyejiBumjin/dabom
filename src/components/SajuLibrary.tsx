"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { RELATIONSHIPS, relationshipLabel, type Relationship } from "@/lib/saju/profile-input";
import { EmptyMailboxCat, PixelEnvelope } from "@/components/RetroWindow";

export type LibraryProfile = {
  id: string; name: string; relationship: Relationship; birthDate: string;
  birthTime: string | null; isLunar: boolean;
  reports: { id: string; year: string; status: string; paid: boolean }[];
};

function ReportLink({ href, preview, children }: { href: string; preview: boolean; children: ReactNode }) {
  return preview
    ? <div className="retro-library-report" aria-disabled="true">{children}</div>
    : <Link className="retro-library-report" href={href}>{children}</Link>;
}

export function SajuLibrary({ profiles, preview = false }: { profiles: LibraryProfile[]; preview?: boolean }) {
  const [filter, setFilter] = useState<Relationship | "ALL">("ALL");
  const visible = profiles.filter(profile => filter === "ALL" || profile.relationship === filter);
  return (
    <>
      <div className="retro-library-filters" aria-label="관계별 운세 보기">
        {[{ value: "ALL" as const, label: "전체" }, ...RELATIONSHIPS].map(item => (
          <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}</button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div className="retro-library-empty"><EmptyMailboxCat /><p>{profiles.length ? "아직 이 관계로 보관한 운세는 없어." : "아직 도착한 메시지가 없어.\n너와 소중한 사람의 올해를 받아봐."}</p></div>
      ) : (
        <div className="retro-library-list">
          {visible.map(profile => (
            <section key={profile.id} className="retro-library-card" data-relationship={profile.relationship} aria-label={`${profile.name}의 운세`}>
              <div className="retro-library-card-bar" aria-hidden="true"><PixelEnvelope /><span>다봄의 메시지</span><span>✧</span></div>
              <div className="retro-library-card-body">
              <div className="retro-library-person"><h2>{profile.name}</h2><span>{relationshipLabel(profile.relationship)}</span></div>
              <p className="retro-library-birth">{profile.birthDate.replaceAll("-", ".")} · {profile.isLunar ? "음력" : "양력"} · {profile.birthTime ?? "시각 모름"}</p>
              {profile.reports.length ? profile.reports.map(report => (
                <ReportLink key={report.id} preview={preview} href={`/saju/reports/${report.id}`}>
                  <span><strong>{report.year}년 올해 운세</strong><small>{report.status === "COMPLETED" ? report.paid ? "구매한 운세 · 추가 결제 없이 다시 보기" : "보관한 운세 다시 보기" : report.status === "FAILED" ? "메시지 준비 다시 이어가기" : "메시지 준비 중"}</small></span>
                  <span aria-hidden="true">→</span>
                </ReportLink>
              )) : <ReportLink preview={preview} href={`/saju/profiles/${profile.id}/checkout`}><span><strong>올해 운세 받기</strong><small>등록한 정보로 메시지를 준비할게.</small></span><span aria-hidden="true">→</span></ReportLink>}
              </div>
            </section>
          ))}
        </div>
      )}
      <Link href="/saju" className="retro-button">다른 사람 운세도 받기</Link>
    </>
  );
}
