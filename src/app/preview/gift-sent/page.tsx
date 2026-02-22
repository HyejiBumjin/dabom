import { BackToHomeLink } from "@/components/BackToHomeLink";
import { GiftShareBox } from "@/components/GiftShareBox";

export default function GiftSentPreviewPage() {
  const giftUrl = "https://example.com/gift/preview-token";

  return (
    <div className="space-y-8 w-full">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">선물 링크가 생성되었습니다</h1>
        <p className="text-zinc-600">
          아래 링크를 선물받는 분에게 공유해 주세요.
        </p>
      </div>
      <GiftShareBox giftUrl={giftUrl} />
      <BackToHomeLink className="block" />
    </div>
  );
}
