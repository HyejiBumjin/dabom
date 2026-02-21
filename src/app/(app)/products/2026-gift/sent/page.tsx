"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { GiftShareBox } from "@/components/GiftShareBox";

function GiftSentContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="text-zinc-600">유효하지 않은 링크입니다.</p>
        <Link href="/" className="text-sm text-zinc-600 hover:underline">
          홈으로
        </Link>
      </div>
    );
  }

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const giftUrl = `${appUrl}/gift/${token}`;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-zinc-900">선물 링크가 생성되었습니다</h2>
      <GiftShareBox giftUrl={giftUrl} />
      <Link href="/" className="block text-sm text-zinc-600 hover:underline">
        홈으로
      </Link>
    </div>
  );
}

export default function GiftSentPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <GiftSentContent />
    </Suspense>
  );
}
