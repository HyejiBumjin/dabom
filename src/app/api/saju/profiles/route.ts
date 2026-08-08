import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { KoreanPolicyAdapter } from "@/lib/saju/korean-policy-adapter";

const inputSchema = z.object({
  name: z.string().trim().min(1).max(40),
  gender: z.enum(["male", "female"]),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  calendar: z.enum(["solar", "lunar"]),
  isLeapMonth: z.boolean(),
});

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "입력값을 다시 확인해 주세요." }, { status: 400 });

  const input = parsed.data;
  try {
    // 태어난 시각을 모르면 시주가 확정되지 않음을 명식에 남기고, 임시 기준 시각으로 계산한다.
    const myeongsik = new KoreanPolicyAdapter().calculate({
      ...input,
      birthTime: input.birthTime ?? "12:00",
      birthTimeKnown: Boolean(input.birthTime),
    });
    const profile = await prisma.sajuProfile.create({
      data: {
        name: input.name,
        gender: input.gender === "male" ? "MALE" : "FEMALE",
        birthDate: new Date(`${input.birthDate}T00:00:00.000Z`),
        birthTime: input.birthTime,
        isLunar: input.calendar === "lunar",
        isLeapMonth: input.isLeapMonth,
        myeongsik: myeongsik as unknown as Prisma.InputJsonValue,
      },
    });
    return NextResponse.json({ profileId: profile.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "명식 계산 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
