import Link from "next/link";
import { SajuProfileForm } from "@/components/SajuProfileForm";

export default function SajuInputPage() {
  return <main className="mx-auto min-h-screen max-w-xl px-5 py-12 sm:py-20"><Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">← 처음으로</Link><header className="mt-8 mb-8"><p className="text-sm text-zinc-500">2026년을 위한 작은 시작</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-900">당신의 시간을<br />들려주세요.</h1><p className="mt-4 leading-7 text-zinc-600">입력한 정보로 명식을 계산한 뒤, 한 편의 편지처럼 당신의 흐름을 읽어드릴게요.</p></header><SajuProfileForm /></main>;
}
