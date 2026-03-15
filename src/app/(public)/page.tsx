import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TopNav } from "@/components/TopNav";
import { GiftComingSoonButton } from "@/components/GiftComingSoonButton";
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
        <div className="text-center animate-fade-in-up">
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
        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center animate-fade-in-up animate-delay-2">
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
          <div className="w-full sm:w-[50%]">
            <GiftComingSoonButton />
          </div>
        </div>
      </main>
    </div>
  );
}
