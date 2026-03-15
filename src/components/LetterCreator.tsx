"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LetterReveal } from "./LetterReveal";

interface LetterCreatorProps {
  reportId: string;
  giftToken?: string;
  initialContent?: string | null;
}

export function LetterCreator({
  reportId,
  giftToken,
  initialContent = null,
}: LetterCreatorProps) {
  const [content, setContent] = useState<string | null>(initialContent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLetter = useCallback(async () => {
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
  }, [giftToken, reportId]);

  useEffect(() => {
    if (!content && !loading && !error) {
      createLetter();
    }
  }, [content, loading, error, createLetter]);

  if (content) {
    return <LetterReveal content={content} />;
  }

  if (loading) {
    return <p className="text-sm text-zinc-600">편지를 준비하고 있어요...</p>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-red-600">{error}</p>
        <Button onClick={createLetter}>다시 시도</Button>
      </div>
    );
  }

  return <p className="text-sm text-zinc-600">편지를 불러오는 중...</p>;
}
