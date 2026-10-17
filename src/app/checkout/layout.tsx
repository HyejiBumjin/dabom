import { TopNav } from "@/components/TopNav";
import { getSajuAccount } from "@/lib/saju/account";

export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSajuAccount();

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <TopNav
        userEmail={user?.email ?? null}

      />
      <main className="mx-auto max-w-2xl px-4 py-16 sm:p-0 sm:flex sm:flex-col sm:items-center sm:justify-center sm:h-[calc(100vh-56px)] sm:-mt-[56px]">
        {children}
      </main>
    </div>
  );
}
