import { TopNav } from "@/components/TopNav";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await (supabase?.auth.getUser() ?? { data: { user: null } });

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
      <main className="mx-auto max-w-2xl px-4 py-16 sm:p-0 sm:flex sm:flex-col sm:items-center sm:justify-center sm:min-h-[calc(100vh-56px)] sm:-mt-[56px]">{children}</main>
    </div>
  );
}
