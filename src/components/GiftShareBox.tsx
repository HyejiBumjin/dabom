"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface GiftShareBoxProps {
  giftUrl: string;
}

export function GiftShareBox({ giftUrl }: GiftShareBoxProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(giftUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement("input");
      input.value = giftUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm font-medium text-zinc-700">선물 링크</p>
      <div className="flex gap-2">
        <input
          readOnly
          value={giftUrl}
          className="flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-600"
        />
        <Button onClick={copyToClipboard} variant="outline">
          {copied ? "복사됨!" : "복사"}
        </Button>
      </div>
      <p className="text-xs text-zinc-500">
        이 링크를 선물받는 분에게 공유해 주세요. 링크는 한 번만 사용할 수 있습니다.
      </p>
    </div>
  );
}
