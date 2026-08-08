import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { DevelopmentReportTrigger } from "@/components/DevelopmentReportTrigger";

export default async function SajuProfilePage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  const profile = await prisma.sajuProfile.findUnique({ where: { id: profileId } });
  if (!profile) notFound();
  const pillarText = (profile.myeongsik as { pillars?: Record<string, { ganZhi?: string }> }).pillars;
  return <main className="mx-auto min-h-screen max-w-xl px-5 py-12 sm:py-20"><Link href="/saju" className="text-sm text-zinc-500 hover:text-zinc-900">← 입력 다시 하기</Link><section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"><p className="text-sm text-zinc-500">{profile.name}님의 명식</p><h1 className="mt-2 text-3xl font-bold text-zinc-900">사주의 결을 살펴봤어요.</h1><p className="mt-5 text-lg tracking-[0.22em] text-zinc-700">{pillarText ? Object.values(pillarText).map((pillar) => pillar.ganZhi).join(" ") : ""}</p><p className="mt-4 text-sm leading-6 text-zinc-600">지금은 결제 전 핵심 흐름을 확인하는 개발 단계입니다. 아래 버튼은 결제 대신 리포트를 생성합니다.</p></section><div className="mt-6"><DevelopmentReportTrigger profileId={profile.id} /></div></main>;
}
