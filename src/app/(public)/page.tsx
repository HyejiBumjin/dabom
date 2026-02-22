import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TopNav } from "@/components/TopNav";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await (supabase?.auth.getUser() ?? { data: { user: null } });

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <TopNav
        userEmail={user?.email ?? null}
        onLogout={async () => {
          "use server";
          const s = await createClient();
          await s?.auth.signOut();
        }}
      />
      <main className="mx-auto max-w-2xl px-4 py-16 sm:p-0 sm:flex sm:flex-col sm:items-center sm:justify-center sm:mt-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-zinc-900 mb-4 font-east-sea-dokdo">
            다봄
          </h1>
          <p className="mt-2 text-zinc-600">
            괜찮을까, 잘될까. <br />
            2026년의 답을 먼저 들어보세요.
          </p>
          <img
            src="/images/img.png"
            alt="다봄"
            className="w-full max-w-48 mx-auto mt-8 sm:max-w-55"
          />
        </div>
        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link href="/products/2026" className="w-full sm:w-[50%]">
            <Button
              size="lg"
              className="w-full flex flex-col items-start justify-between h-auto py-8 cursor-pointer text-left sm:h-full"
            >
              <div className="flex flex-col items-start">
                <h3 className="text-2xl font-bold">2026년 운세 보기</h3>
                <p>흐름과 기회, 그리고 한 통의 편지</p>
              </div>
              <span className="mt-4">지금 확인하기</span>
            </Button>
          </Link>
          <Link href="/products/2026-gift" className="w-full sm:w-[50%]">
            <Button
              size="lg"
              variant="outline"
              className="w-full flex flex-col items-start justify-between h-auto py-8 cursor-pointer text-left sm:h-full bg-white"
            >
              <div className="flex flex-col items-start">
                <h3 className="text-2xl font-bold">2026년 운세 선물하기</h3>
                <p>소중한 사람에게 올 한 해 운세를 선물해보세요</p>
              </div>
              <span className="mt-4">선물하기</span>
            </Button>
          </Link>
        </div>

        <div className="mt-24 pt-8 border-t border-zinc-200 w-full max-w-2xl sm:mb-20">
          <p className="text-sm text-zinc-500 text-center mb-4">
            디자인 미리보기
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link href="/preview/gift-receiver">
              <Button variant="outline" size="sm">
                선물 받기
              </Button>
            </Link>
            <Link href="/preview/login">
              <Button variant="outline" size="sm">
                로그인
              </Button>
            </Link>
            <Link href="/preview/products-2026">
              <Button variant="outline" size="sm">
                2026 운세 보기
              </Button>
            </Link>
            <Link href="/preview/products-2026-gift">
              <Button variant="outline" size="sm">
                2026 운세 선물하기
              </Button>
            </Link>
            <Link href="/preview/gift-sent">
              <Button variant="outline" size="sm">
                선물 링크 생성
              </Button>
            </Link>
            <Link href="/preview/report">
              <Button variant="outline" size="sm">
                운세 결과
              </Button>
            </Link>
            <Link href="/preview/letter">
              <Button variant="outline" size="sm">
                편지 만들기
              </Button>
            </Link>
            <Link href="/preview/checkout-success">
              <Button variant="outline" size="sm">
                결제 확인
              </Button>
            </Link>
            <Link href="/preview/checkout-fail">
              <Button variant="outline" size="sm">
                결제 실패
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
