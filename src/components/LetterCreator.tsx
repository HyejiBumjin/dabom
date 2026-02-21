"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LetterReveal } from "./LetterReveal";

interface LetterCreatorProps {
  reportId: string;
  giftToken?: string;
}

export function LetterCreator({ reportId, giftToken }: LetterCreatorProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLetter = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/letters/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, giftToken: giftToken || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "편지 생성 실패");
        return;
      }
      setContent(data.content);
    } catch {
      setError("편지 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (content) {
    return <LetterReveal content={content} />;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Button onClick={createLetter} disabled={loading}>
        {loading ? "편지 만드는 중..." : "💌 나에게 보내는 운세 편지 만들기"}
      </Button>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
