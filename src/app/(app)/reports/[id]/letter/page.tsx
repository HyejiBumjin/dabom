import { notFound } from "next/navigation";
import { LetterCreator } from "@/components/LetterCreator";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { canAccessReport, canAccessReportByGiftToken } from "@/lib/fortune/access";

export default async function LetterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ giftToken?: string }>;
}) {
  const { id } = await params;
  const { giftToken } = await searchParams;

  const supabase = await createServiceRoleClient();
  if (!supabase) notFound();

  const anonClient = await import("@/lib/supabase/server").then((m) => m.createClient());
  const { data: { user } } = await (anonClient?.auth.getUser() ?? { data: { user: null } });

  const byOwner = user && (await canAccessReport(supabase, id, user.id));
  const byGift = await canAccessReportByGiftToken(supabase, id, giftToken ?? null);

  if (!byOwner && !byGift) notFound();

  return (
    <div className="space-y-8">
      <div className="text-center sm:text-left">
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">나에게 보내는 운세 편지</h1>
        <p className="text-zinc-600">
          스스로에게 보내는 2026년의 한 통의 편지
        </p>
      </div>
      <LetterCreator reportId={id} giftToken={giftToken} />
    </div>
  );
}
