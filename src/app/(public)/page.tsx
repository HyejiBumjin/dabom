import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TopNav } from "@/components/TopNav";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await (supabase?.auth.getUser() ?? { data: { user: null } });

  return (
    <div className="min-h-screen bg-zinc-50">
      <TopNav
        userEmail={user?.email ?? null}
        onLogout={async () => {
          "use server";
          const s = await createClient();
          await s?.auth.signOut();
        }}
      />
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-zinc-900">다봄</h1>
          <p className="mt-2 text-zinc-600">2026년, 나를 위한 운세</p>
        </div>
        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link href="/products/2026">
            <Button size="lg" className="w-full sm:w-auto">
              2026년 운세 보기 (3,900원)
            </Button>
          </Link>
          <Link href="/products/2026-gift">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              2026년 운세 선물하기 (3,900원)
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
