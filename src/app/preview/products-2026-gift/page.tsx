import Link from "next/link";
import { GiftPurchaseForm } from "@/components/GiftPurchaseForm";

export default function Products2026GiftPreviewPage() {
  return (
    <div className="space-y-8 w-full">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">2026년 운세 선물하기</h1>
        <p className="text-zinc-600">
          소중한 사람에게 올 한 해 운세를 선물해보세요
        </p>
      </div>
      <GiftPurchaseForm preview />
    </div>
  );
}
