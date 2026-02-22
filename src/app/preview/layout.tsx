import { TopNav } from "@/components/TopNav";
import { createClient } from "@/lib/supabase/server";

export default async function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await (supabase?.auth.getUser() ?? { data: { user: null } });

  return (
    <div className="relative min-h-screen bg-[#f7f7f7]">
      <TopNav
        userEmail={user?.email ?? null}
        onLogout={async () => {
          "use server";
          const s = await createClient();
          await s?.auth.signOut();
        }}
      />
      <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          디자인 미리보기 모드
        </div>
      </div>
      <main className="mx-auto max-w-2xl px-4 py-16 sm:p-0 sm:flex sm:flex-col sm:items-center sm:justify-center sm:h-[calc(100vh-56px)] sm:-mt-[56px]">
        {children}
      </main>
    </div>
  );
}
