"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LetterReveal } from "./LetterReveal";

interface LetterCreatorProps {
  reportId: string;
  giftToken?: string;
  initialContent?: string | null;
}

export function LetterCreator({ reportId, giftToken, initialContent = null }: LetterCreatorProps) {
  const { data: content, isFetching, error, refetch } = useQuery({
    queryKey: ["legacy-letter", reportId, giftToken ?? null],
    enabled: !initialContent,
    initialData: initialContent || undefined,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/letters/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, giftToken: giftToken || undefined }),
        signal,
      });
      const data = await response.json();
      if (!response.ok || typeof data.content !== "string" || !data.content.trim()) {
        throw new Error(response.status === 410 ? "더 이상 제공하지 않는 편지 기능이야." : "편지를 불러오지 못했어. 잠시 뒤 다시 시도해줘.");
      }
      return data.content as string;
    },
  });

  if (content) return <LetterReveal content={content} />;
  if (isFetching) return <p className="text-sm text-zinc-600">편지를 준비하고 있어요...</p>;
  if (error) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-red-600">{error.message}</p>
        <Button onClick={() => void refetch()}>다시 시도</Button>
      </div>
    );
  }
  return <p className="text-sm text-zinc-600">편지를 불러오는 중...</p>;
}
