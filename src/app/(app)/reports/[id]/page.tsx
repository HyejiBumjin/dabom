import { notFound } from "next/navigation";
import { FortuneReport } from "@/components/FortuneReport";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { canAccessReport, canAccessReportByGiftToken } from "@/lib/fortune/access";

export default async function ReportPage({
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

  const { data: report } = await supabase
    .from("fortune_reports")
    .select("result")
    .eq("id", id)
    .single();

  if (!report) notFound();

  const result = report.result as Parameters<typeof FortuneReport>[0]["result"];

  return (
    <div className="space-y-8">
      <div className="text-center sm:text-left">
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">2026년 운세</h1>
        <p className="text-zinc-600">
          흐름과 기회, 그리고 한 통의 편지
        </p>
      </div>
      <FortuneReport result={result} reportId={id} giftToken={giftToken} />
    </div>
  );
}
