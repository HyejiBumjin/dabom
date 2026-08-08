import Link from "next/link";
import { EssayReportView } from "@/components/EssayReportView";

export default async function SajuReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  return <main className="mx-auto min-h-screen max-w-2xl px-5 py-12 sm:py-20"><Link href="/saju" className="text-sm text-zinc-500 hover:text-zinc-900">← 새로 입력하기</Link><header className="mb-8 mt-8"><p className="text-sm text-zinc-500">2026년의 흐름</p><h1 className="mt-2 text-3xl font-bold text-zinc-900">당신에게 보내는 편지</h1></header><EssayReportView reportId={reportId} /></main>;
}
