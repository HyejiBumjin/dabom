import { LetterCreator } from "@/components/LetterCreator";

export default function LetterPreviewPage() {
  return (
    <div className="space-y-8 w-full">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">나에게 보내는 운세 편지</h1>
        <p className="text-zinc-600">
          스스로에게 보내는 2026년의 한 통의 편지
        </p>
      </div>
      <LetterCreator reportId="preview" giftToken={undefined} />
    </div>
  );
}
