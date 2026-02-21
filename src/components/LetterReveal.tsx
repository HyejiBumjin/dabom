"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LetterRevealProps {
  content: string;
}

export function LetterReveal({ content }: LetterRevealProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center">
      {!revealed ? (
        <Card className="w-full max-w-md cursor-pointer transition-transform hover:scale-[1.02]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 text-6xl">✉️</div>
            <p className="mb-4 text-center text-zinc-600">
              나에게 보내는 운세 편지
            </p>
            <Button size="lg" onClick={() => setRevealed(true)}>
              편지 열기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-lg">
          <CardContent className="whitespace-pre-wrap py-8 font-serif text-zinc-700 leading-relaxed">
            {content}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
