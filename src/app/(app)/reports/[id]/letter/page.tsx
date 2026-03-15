import { notFound } from "next/navigation";
import { BackToHomeLink } from "@/components/BackToHomeLink";
import { LetterCreator } from "@/components/LetterCreator";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { canAccessReport, canAccessReportByGiftToken } from "@/lib/fortune/access";

export default async function LetterPage({
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

  const { data: existingLetter } = await supabase
    .from("fortune_letters")
    .select("content")
    .eq("report_id", id)
    .maybeSingle();

  return (
    <div className="w-full space-y-8">
      <div className="text-center sm:text-left">
        <BackToHomeLink
          className="mb-4 block"
          href={fromList ? "/reports" : "/"}
          children={fromList ? "뒤로가기" : "홈으로"}
        />
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">나에게 보내는 운세 편지</h1>
        <p className="text-zinc-600">
          스스로에게 보내는 2026년의 한 통의 편지
        </p>
      </div>
      <LetterCreator
        reportId={id}
        giftToken={giftToken}
        initialContent={existingLetter?.content ?? null}
      />
    </div>
  );
}
