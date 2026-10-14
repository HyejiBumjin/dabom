"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { announceAuthChange, clearProfileDraft } from "@/lib/auth-change";

interface TopNavProps {
  userEmail?: string | null;
  loggedIn?: boolean;
  onLogout?: () => void;
}

export function TopNav({ userEmail, loggedIn = Boolean(userEmail) }: TopNavProps) {
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) return;
    announceAuthChange();
    queryClient.clear();
    clearProfileDraft();
    // A full navigation also drops Next's cached private page trees.
    window.location.replace("/");
  };

  return (
    <nav className="">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-end px-4">
        <div className="flex items-center gap-3">
          {loggedIn ? (
            <>
              <Link href="/saju/library" className="text-sm text-zinc-700 hover:underline">
                내 운세함
              </Link>
              {userEmail && <span className="text-sm text-zinc-600">{userEmail}</span>}
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                로그아웃
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm">
                로그인
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
