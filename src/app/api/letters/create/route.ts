import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateLetter } from "@/lib/fortune/service";
import { canAccessReport, canAccessReportByGiftToken } from "@/lib/fortune/access";

export async function POST(request: Request) {
  const supabase = await createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { reportId, giftToken } = body;

  if (!reportId) {
    return NextResponse.json(
      { error: "reportId required" },
      { status: 400 }
    );
  }

  const anonClient = await import("@/lib/supabase/server").then((m) => m.createClient());
  const {
    data: { user },
  } = await (anonClient?.auth.getUser() ?? { data: { user: null } });

  const byOwner = user && (await canAccessReport(supabase, reportId, user.id));
  const byGift = await canAccessReportByGiftToken(supabase, reportId, giftToken || null);

  if (!byOwner && !byGift) {
    return NextResponse.json(
      { error: "접근 권한이 없습니다." },
      { status: 403 }
    );
  }

  const { data: report } = await supabase
    .from("fortune_reports")
    .select("result")
    .eq("id", reportId)
    .single();

  if (!report) {
    return NextResponse.json(
      { error: "운세를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const { data: existing } = await supabase
    .from("fortune_letters")
    .select("id, content")
    .eq("report_id", reportId)
    .single();

  if (existing) {
    return NextResponse.json({
      letterId: existing.id,
      content: existing.content,
    });
  }

  const content = generateLetter(report.result as Parameters<typeof generateLetter>[0]);

  const { data: letter } = await supabase
    .from("fortune_letters")
    .insert({
      report_id: reportId,
      content,
    })
    .select("id")
    .single();

  return NextResponse.json({
    letterId: letter?.id,
    content,
  });
}
