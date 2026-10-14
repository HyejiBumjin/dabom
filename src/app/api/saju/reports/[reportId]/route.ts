import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ReportContent } from "@/lib/llm/types";
import { PUBLIC_REPORT_FAILURE_MESSAGE } from "@/lib/llm/report-messages";
import { getSajuAccount, canReadSajuReport } from "@/lib/saju/account";

export async function GET(_request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const account = await getSajuAccount();
  if (!account) return NextResponse.json({ error: "로그인이 필요해." }, { status: 401 });
  const report = await prisma.report.findUnique({ where: { id: reportId }, select: { id: true, status: true, content: true, sajuProfile: { select: { userId: true } }, order: { select: { userId: true, status: true } } } });
  if (!report || !canReadSajuReport(report, account)) return NextResponse.json({ error: "리포트를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ id: report.id, status: report.status, content: report.content as ReportContent | null, lastError: report.status === "FAILED" ? PUBLIC_REPORT_FAILURE_MESSAGE : null }, { headers: { "Cache-Control": "private, no-store" } });
}
