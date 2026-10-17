import { TopNav } from "@/components/TopNav";
import { getSajuAccount } from "@/lib/saju/account";
import { notFound } from "next/navigation";

export default async function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const user = await getSajuAccount();

  return (
    <div className="relative min-h-screen bg-[#f7f7f7]">
      <TopNav
        userEmail={user?.email ?? null}
        loggedIn={Boolean(user)}

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
