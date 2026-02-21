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
    <div className="min-h-screen bg-zinc-50">
      <TopNav
        userEmail={user?.email ?? null}
        onLogout={async () => {
          "use server";
          const s = await createClient();
          await s?.auth.signOut();
        }}
      />
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  );
}
