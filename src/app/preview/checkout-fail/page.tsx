import { BackToHomeLink } from "@/components/BackToHomeLink";

export default function CheckoutFailPreviewPage() {
  return (
    <div className="text-center space-y-6 w-full">
      <h1 className="text-4xl font-bold text-zinc-900 mb-4">결제 실패</h1>
      <p className="text-zinc-600">
        결제 처리 중 문제가 발생했습니다.
      </p>
      <BackToHomeLink className="block" />
    </div>
  );
}
