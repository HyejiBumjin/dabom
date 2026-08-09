import { NextResponse } from "next/server";
import { generateReport } from "@/lib/llm/report-generator";
import { prisma } from "@/lib/db";

// 최대 3회의 OpenAI 요청(각 30초)을 Vercel이 중간에 종료하지 않게 한다.
export const maxDuration = 120;

export async function POST(_request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const report = await prisma.report.findUnique({ where: { id: reportId }, select: { id: true } });
  if (!report) return NextResponse.json({ error: "리포트를 찾을 수 없습니다." }, { status: 404 });
  await generateReport(reportId);
  return NextResponse.json({ ok: true });
}
