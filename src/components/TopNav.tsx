"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface TopNavProps {
  userEmail?: string | null;
  onLogout?: () => void;
}

export function TopNav({ userEmail }: TopNavProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold text-zinc-900">
          다봄
        </Link>
        <div className="flex items-center gap-3">
          {userEmail ? (
            <>
              <span className="text-sm text-zinc-600">{userEmail}</span>
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
