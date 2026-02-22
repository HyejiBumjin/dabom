import Link from "next/link";
import { SelfPurchaseForm } from "@/components/SelfPurchaseForm";

export default function Products2026PreviewPage() {
  return (
    <div className="space-y-8 w-full">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">2026년 운세 보기</h1>
        <p className="text-zinc-600">
          흐름과 기회, 그리고 한 통의 편지
        </p>
      </div>
      <SelfPurchaseForm preview />
    </div>
  );
}
