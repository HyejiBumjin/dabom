import Link from "next/link";

export default function GiftLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-semibold text-zinc-900">
            다봄
          </Link>
        </div>
      </nav>
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  );
}
