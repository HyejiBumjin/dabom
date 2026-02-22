"use client";

import { BackToHomeLink } from "@/components/BackToHomeLink";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfigNotice } from "@/components/ConfigNotice";
import { runtimeConfig } from "@/lib/runtime-config";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleKakaoLogin = () => {
    if (!runtimeConfig.supabaseReady) return;
    window.location.href = "/api/auth/login";
  };

  return (
    <div className="text-center w-full">
      <div className="w-full max-w-sm mx-auto space-y-4">
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">로그인</h1>
        <p className="text-zinc-600">카카오로 간편하게 시작하세요</p>
        <ConfigNotice
          missingSupabase={!runtimeConfig.supabaseReady}
        />
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error === "no_code" && "인증 코드가 없습니다."}
            {error === "config" && "설정 오류입니다."}
            {typeof error === "string" && !["no_code", "config"].includes(error) && decodeURIComponent(error)}
          </p>
        )}
        <Button
          onClick={handleKakaoLogin}
          disabled={!runtimeConfig.supabaseReady}
          className="w-full"
        >
          카카오로 로그인
        </Button>
        <p className="text-center">
          <BackToHomeLink />
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-zinc-600 py-12">로딩 중...</div>}>
      <LoginContent />
    </Suspense>
  );
}
