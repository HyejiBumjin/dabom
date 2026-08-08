import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ReportContent } from "@/lib/llm/types";

export async function GET(_request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const report = await prisma.report.findUnique({ where: { id: reportId }, select: { id: true, status: true, content: true, lastError: true } });
  if (!report) return NextResponse.json({ error: "리포트를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ...report, content: report.content as ReportContent | null });
}
