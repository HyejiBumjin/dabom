"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function CheckoutFailContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const message = searchParams.get("message");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h2 className="text-xl font-semibold text-zinc-900">결제 실패</h2>
      {code && <p className="text-sm text-zinc-600">코드: {code}</p>}
      {message && <p className="text-sm text-zinc-600">{decodeURIComponent(message)}</p>}
      <Link href="/" className="text-zinc-600 hover:underline">
        홈으로
      </Link>
    </div>
  );
}

export default function CheckoutFailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">로딩 중...</div>}>
      <CheckoutFailContent />
    </Suspense>
  );
}
