import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { canAccessReport, canAccessReportByGiftToken } from "@/lib/fortune/access";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const giftToken = searchParams.get("giftToken");

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
