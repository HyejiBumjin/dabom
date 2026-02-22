import Link from "next/link";
import { GiftReceiverForm } from "@/components/GiftReceiverForm";

export default function GiftReceiverPreviewPage() {
  return (
    <div className="w-full space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">
          2026년 운세 선물
        </h1>
        <p className="text-zinc-600">소중한 분께서 보내주신 운세 선물입니다.</p>
      </div>
      <GiftReceiverForm token="preview" preview />
    </div>
  );
}
