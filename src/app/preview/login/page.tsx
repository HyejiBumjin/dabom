import { BackToHomeLink } from "@/components/BackToHomeLink";
import { Button } from "@/components/ui/button";

export default function LoginPreviewPage() {
  return (
    <div className="text-center w-full">
      <div className="w-full max-w-sm mx-auto space-y-4">
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">로그인</h1>
        <p className="text-zinc-600">카카오로 간편하게 시작하세요</p>
        <Button className="w-full" disabled>
          카카오로 로그인
        </Button>
        <p className="text-center">
          <BackToHomeLink />
        </p>
      </div>
    </div>
  );
}
