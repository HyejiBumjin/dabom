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
    <div className="space-y-6">
      <FortuneReport result={result} reportId={id} giftToken={giftToken} />
    </div>
  );
}
