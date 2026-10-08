import { NextResponse } from "next/server";
import { generateReport } from "@/lib/llm/report-generator";
import { prisma } from "@/lib/db";
import { PUBLIC_REPORT_FAILURE_MESSAGE } from "@/lib/llm/report-messages";

// Generation and editorial repair share a bounded request budget.
export const maxDuration = 55;

export async function POST(_request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const report = await prisma.report.findUnique({ where: { id: reportId }, select: { id: true } });
  if (!report) return NextResponse.json({ error: "리포트를 찾을 수 없습니다." }, { status: 404 });
  try {
    await generateReport(reportId);
    const result = await prisma.report.findUnique({ where: { id: reportId }, select: { status: true } });
    if (!result || result.status === "FAILED") return NextResponse.json({ ok: false, error: PUBLIC_REPORT_FAILURE_MESSAGE }, { status: 503 });
    return NextResponse.json({ ok: true, status: result.status });
  } catch {
    console.error("[Report] Generation request failed", { reportId });
    return NextResponse.json({ ok: false, error: PUBLIC_REPORT_FAILURE_MESSAGE }, { status: 503 });
  }
}
