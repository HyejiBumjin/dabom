import { Card, CardContent } from "@/components/ui/card";

interface LetterRevealProps {
  content: string;
}

export function LetterReveal({ content }: LetterRevealProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardContent className="whitespace-pre-wrap py-8 text-zinc-700 leading-relaxed">
          {content}
        </CardContent>
      </Card>
    </div>
  );
}
