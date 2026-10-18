"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AUTH_CHANGE_EVENT, AUTH_CHANGE_KEY, clearProfileDraft } from "@/lib/auth-change";
import { retryAfterSeconds } from "@/lib/report-access-error";

/** Server authorization is still required. This guard revokes already rendered UI. */
export function AccountPrivacyBoundary({ accountId, returnPath, children, compact = false }: { accountId: string; returnPath: string; children: ReactNode; compact?: boolean }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<"checking" | "verified" | "unavailable" | "revoked">("checking");
  const [mounted, setMounted] = useState(false);
  const revoked = useRef(false);
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  const retryAt = useRef(0);
  const [rateLimited, setRateLimited] = useState(false);
  const loginUrl = `/login?next=${encodeURIComponent(returnPath)}`;
  const abortVerification = useCallback(() => {
    generation.current++;
    request.current?.abort();
    request.current = null;
  }, []);

  const revoke = useCallback(() => {
    if (revoked.current) return;
    revoked.current = true;
    abortVerification();
    // Hide before navigation or a late response can paint the previous account.
    flushSync(() => setState("revoked"));
    void queryClient.cancelQueries();
    queryClient.clear();
    clearProfileDraft();
    window.location.replace(loginUrl);
  }, [queryClient, loginUrl, abortVerification]);

  const verify = useCallback(async () => {
    // Focus and visibility events often arrive together. Share the pending check.
    if (revoked.current || document.visibilityState === "hidden" || request.current || Date.now() < retryAt.current) return;
    const current = ++generation.current;
    const controller = new AbortController();
    request.current = controller;
    const deadline = setTimeout(() => controller.abort(), 8000);
    // Keep a verified screen visible during routine polling/foreground checks.
    // Initial display, failed checks and BFCache restores still fail closed.
    setState(previous => previous === "verified" ? previous : "checking");
    try {
      const response = await fetch("/api/auth/account", { cache: "no-store", signal: controller.signal });
      if (current !== generation.current || revoked.current) return;
      if (response.status === 401) { revoke(); return; }
      if (response.status === 429) {
        retryAt.current = Date.now() + retryAfterSeconds(response.headers.get("retry-after")) * 1000;
        setRateLimited(true);
        setState("unavailable");
        return;
      }
      if (!response.ok) throw new Error("Session unavailable");
      const identity = await response.json() as { accountId?: unknown };
      if (current !== generation.current || revoked.current) return;
      if (identity.accountId !== accountId) { revoke(); return; }
      setMounted(true);
      setRateLimited(false);
      setState("verified");
    } catch {
      if (current === generation.current && !revoked.current) setState("unavailable");
    } finally {
      clearTimeout(deadline);
      if (request.current === controller) request.current = null;
    }
  }, [accountId, revoke]);

  useEffect(() => {
    const checkVisible = () => { if (document.visibilityState === "visible") void verify(); };
    const hideForRestore = () => {
      // A pending response must not uncover the snapshot after pagehide.
      abortVerification();
      flushSync(() => setState("checking"));
    };
    const restored = (event: PageTransitionEvent) => { if (event.persisted) void verify(); };
    const storage = (event: StorageEvent) => { if (event.key === AUTH_CHANGE_KEY && event.newValue) revoke(); };
    let channel: BroadcastChannel | undefined;
    try {
      channel = new BroadcastChannel(AUTH_CHANGE_KEY);
      channel.onmessage = event => { if (event.data === "signed-out") revoke(); };
    } catch { /* Storage and foreground revalidation remain active. */ }
    window.addEventListener(AUTH_CHANGE_EVENT, revoke);
    window.addEventListener("storage", storage);
    window.addEventListener("focus", checkVisible);
    window.addEventListener("pagehide", hideForRestore);
    window.addEventListener("pageshow", restored);
    document.addEventListener("visibilitychange", checkVisible);
    // Also detect logout/token revocation when browser broadcast is unavailable.
    const interval = setInterval(checkVisible, 30_000);
    const initial = setTimeout(() => { void verify(); }, 0);
    return () => {
      abortVerification();
      clearTimeout(initial); clearInterval(interval); channel?.close();
      window.removeEventListener(AUTH_CHANGE_EVENT, revoke);
      window.removeEventListener("storage", storage);
      window.removeEventListener("focus", checkVisible);
      window.removeEventListener("pagehide", hideForRestore);
      window.removeEventListener("pageshow", restored);
      document.removeEventListener("visibilitychange", checkVisible);
    };
  }, [verify, revoke, abortVerification]);

  if (state === "revoked") return <p role="status">로그인 화면으로 이동할게.</p>;
  return <>
    {state === "checking" && <div className={compact ? "h-14" : "retro-page"} role="status" aria-label="화면 불러오는 중" aria-busy="true">
      {!compact && <div className="retro-window" aria-hidden="true">
        <div className="retro-titlebar"><span className="h-4 w-24 rounded bg-white/60" /></div>
        <div className="space-y-6 p-8 motion-safe:animate-pulse">
          <div className="h-8 w-36 rounded bg-violet-100" />
          <div className="h-4 w-3/4 rounded bg-slate-100" />
          <div className="h-40 rounded bg-slate-100" />
        </div>
      </div>}
    </div>}
    {state === "unavailable" && <section className={compact ? "text-sm" : "retro-status"} role="status">
      <p>{rateLimited ? "요청이 잠깐 몰렸어. 조금 기다리면 자동으로 다시 연결할게." : "연결이 잠깐 끊겼어. 다시 연결해줘."}</p>
      <button type="button" className="retro-button" onClick={() => void verify()}>다시 연결하기</button>
    </section>}
    {/* Keep an in-progress form mounted during a same-account foreground check. */}
    {mounted && <div hidden={state !== "verified"} inert={state !== "verified"}>{children}</div>}
  </>;
}
