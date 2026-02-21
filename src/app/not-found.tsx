import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h2 className="text-xl font-semibold text-zinc-900">페이지를 찾을 수 없습니다</h2>
      <Link href="/" className="text-zinc-600 hover:underline">
        홈으로
      </Link>
    </div>
  );
}
