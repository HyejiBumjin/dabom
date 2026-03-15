import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { canAccessReport, canAccessReportByGiftToken } from "@/lib/fortune/access";

const reportParamsSchema = z.object({
  id: z.string().uuid(),
});

const reportQuerySchema = z.object({
  giftToken: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const parsedParams = reportParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
  }
  const { id } = parsedParams.data;
  const { searchParams } = new URL(request.url);
  const parsedQuery = reportQuerySchema.safeParse({
    giftToken: searchParams.get("giftToken") || undefined,
  });
  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const giftToken = parsedQuery.data.giftToken || null;

  const supabase = await createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const anonClient = await import("@/lib/supabase/server").then((m) => m.createClient());
  const {
    data: { user },
  } = await (anonClient?.auth.getUser() ?? { data: { user: null } });

  const byOwner = user && (await canAccessReport(supabase, id, user.id));
  const byGift = await canAccessReportByGiftToken(supabase, id, giftToken);

  if (!byOwner && !byGift) {
    return NextResponse.json(
      { error: "접근 권한이 없습니다." },
      { status: 403 }
    );
  }

  const { data: report, error } = await supabase
    .from("fortune_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !report) {
    return NextResponse.json(
      { error: "운세를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json(report);
}
