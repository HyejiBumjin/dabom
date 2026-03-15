import { notFound } from "next/navigation";
import { BackToHomeLink } from "@/components/BackToHomeLink";
import { FortuneReport } from "@/components/FortuneReport";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { canAccessReport, canAccessReportByGiftToken } from "@/lib/fortune/access";
import { normalizeSajuInput, getSajuInputHash } from "@/lib/saju/normalize";
import type { FortuneInput } from "@/lib/fortune/types";

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ giftToken?: string; from?: string }>;
}) {
  const { id } = await params;
  const { giftToken, from } = await searchParams;
  const fromList = from === "list";

  const supabase = await createServiceRoleClient();
  if (!supabase) notFound();

  const anonClient = await import("@/lib/supabase/server").then((m) => m.createClient());
  const { data: { user } } = await (anonClient?.auth.getUser() ?? { data: { user: null } });

  const byOwner = user && (await canAccessReport(supabase, id, user.id));
  const byGift = await canAccessReportByGiftToken(supabase, id, giftToken ?? null);

  if (!byOwner && !byGift) notFound();

  const { data: report } = await supabase
    .from("fortune_reports")
    .select("result,input")
    .eq("id", id)
    .single();

  if (!report) notFound();

  const result = report.result as Parameters<typeof FortuneReport>[0]["result"];
  const input = report.input as Partial<FortuneInput> | null;

  let ablecityRaw: Record<string, unknown> | null = null;
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev && input?.birthDate) {
    const normalized = normalizeSajuInput({
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      gender: input.gender,
      name: input.name,
      relationship: input.relationship,
      calendarType: input.calendarType,
      leapMonthType: input.leapMonthType,
    });
    const inputHash = getSajuInputHash(normalized);

    const { data: calc } = await supabase
      .from("saju_calculations")
      .select("provider_raw")
      .eq("input_hash", inputHash)
      .eq("provider", "ablecity")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    ablecityRaw = (calc?.provider_raw as Record<string, unknown> | null) ?? null;
  }

  return (
    <div className="w-full space-y-8">
      <div className="text-center sm:text-left">
        <BackToHomeLink
          className="mb-4 block"
          href={fromList ? "/reports" : "/"}
          children={fromList ? "뒤로가기" : "홈으로"}
        />
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">2026년 운세</h1>
        <p className="text-zinc-600">
          흐름과 기회, 그리고 한 통의 편지
        </p>
      </div>
      <FortuneReport
        result={result}
        reportId={id}
        giftToken={giftToken}
        fromList={fromList}
        ablecityRaw={ablecityRaw}
      />
    </div>
  );
}
