"use client";

import { overseasNoticeSummary } from "@/lib/privacy/overseas-notice";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RetroFooter, RetroPage, RetroWindow } from "@/components/RetroWindow";
import { safeReturnPath } from "@/lib/auth-return-path";

function LoginHeader() {
  return <h1 className="retro-heading">로그인</h1>;
}

function LoginContent({ loginReady }: { loginReady: boolean }) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleKakaoLogin = () => {
    if (!loginReady) return;
    window.location.href = `/api/auth/login?next=${encodeURIComponent(safeReturnPath(searchParams.get("next")))}`;
  };

  return (
    <section className="retro-login">
        <LoginHeader />
        <p className="retro-login-copy">받은 운세는 내 운세함에 저장돼.</p>
        <p className="retro-form-help">{overseasNoticeSummary.login} <Link href="/privacy#overseas">국외 처리와 개인정보 안내</Link></p>
        {error && (
          <p className="retro-error" role="alert">
            {error === "no_code" && "로그인 연결이 끊겼어. 카카오로 다시 시작해줘."}
            {error === "config" && "지금은 로그인을 준비 중이야. 잠시 뒤 다시 와줘."}
            {typeof error === "string" && !["no_code", "config"].includes(error) && "로그인을 완료하지 못했어. 다시 시도해줘."}
          </p>
        )}
        {!error && !loginReady && <p className="retro-error" role="status">지금은 로그인을 준비 중이야.<br />잠시 뒤 다시 와줘.</p>}
        <button
          type="button"
          onClick={handleKakaoLogin}
          disabled={!loginReady}
          className="retro-button retro-kakao-button"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3C6.5 3 2 6.4 2 10.5c0 2.7 1.9 5.1 4.8 6.4L5.5 21l5.1-3.1H12c5.5 0 10-3.3 10-7.4S17.5 3 12 3Z" /></svg>
          카카오로 로그인
        </button>
        <Link href="/" className="retro-back-link retro-login-back">← 메인 화면으로 돌아가기</Link>
        <RetroFooter />
    </section>
  );
}

export default function LoginScreen({ loginReady }: { loginReady: boolean }) {
  return (
    <RetroPage className="retro-auth-page"><RetroWindow title="다봄 · 로그인" closeHref="/" className="retro-window--login">
      <Suspense fallback={<section className="retro-login" aria-busy="true"><LoginHeader /><p className="retro-login-copy" role="status">카카오 로그인을 준비하고 있어.</p></section>}>
        <LoginContent loginReady={loginReady} />
      </Suspense>
    </RetroWindow></RetroPage>
  );
}
