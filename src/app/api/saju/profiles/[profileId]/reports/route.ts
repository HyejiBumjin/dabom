import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { REPORT_PROMPT_VERSION } from "@/lib/prompts/v6";

const PRODUCT_CODE = "yearly_2026";

export async function POST(_request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  const profile = await prisma.sajuProfile.findUnique({ where: { id: profileId }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "사주 정보를 찾을 수 없습니다." }, { status: 404 });

  const existing = await prisma.report.findUnique({ where: { sajuProfileId_productCode: { sajuProfileId: profile.id, productCode: PRODUCT_CODE } } });
  if (existing) return NextResponse.json({ reportId: existing.id, existing: true });

  const report = await prisma.report.create({
    data: {
      sajuProfileId: profile.id,
      productCode: PRODUCT_CODE,
      promptVersion: REPORT_PROMPT_VERSION,
      model: process.env.OPENAI_MODEL || "gpt-4o",
    },
  });
  return NextResponse.json({ reportId: report.id, existing: false }, { status: 201 });
}
