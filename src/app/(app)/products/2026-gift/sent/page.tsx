"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BackToHomeLink } from "@/components/BackToHomeLink";
import { GiftShareBox } from "@/components/GiftShareBox";

function GiftSentContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!token) {
    return (
      <div className="space-y-8 text-center sm:text-left">
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">알림</h1>
        <p className="text-zinc-600">유효하지 않은 링크입니다.</p>
        <BackToHomeLink className="block" />
      </div>
    );
  }

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const giftUrl = `${appUrl}/gift/${token}`;

  return (
    <div className="space-y-8">
      <div className="text-center sm:text-left">
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">선물 링크가 생성되었습니다</h1>
        <p className="text-zinc-600">
          아래 링크를 선물받는 분에게 공유해 주세요.
        </p>
      </div>
      <GiftShareBox giftUrl={giftUrl} />
      <BackToHomeLink className="block" />
    </div>
  );
}

export default function GiftSentPage() {
  return (
    <Suspense fallback={<div className="text-center text-zinc-600 py-12">로딩 중...</div>}>
      <GiftSentContent />
    </Suspense>
  );
}
