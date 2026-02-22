import { BackToHomeLink } from "@/components/BackToHomeLink";

export default function CheckoutSuccessPreviewPage() {
  return (
    <div className="text-center space-y-6 w-full">
      <h1 className="text-4xl font-bold text-zinc-900 mb-4">결제 확인 중</h1>
      <p className="text-zinc-600">잠시만 기다려 주세요.</p>
      <BackToHomeLink className="block" />
    </div>
  );
}
