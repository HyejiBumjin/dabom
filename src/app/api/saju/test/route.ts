import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchAblecitySaju } from "@/lib/saju/ablecity";
import type { NormalizedSajuInput } from "@/lib/saju/types";

const testInputSchema = z
  .object({
    birthDate: z.string().min(1).optional(),
    birthTime: z.string().optional(),
    gender: z.string().optional(),
    name: z.string().optional(),
    calendarType: z.enum(["solar", "lunar"]).optional(),
    leapMonthType: z.enum(["regular", "leap"]).optional(),
  })
  .optional();

const defaultInput: NormalizedSajuInput = {
  birthDate: "1990-01-01",
  birthTime: "01:00",
  gender: "male",
  name: "테스트",
  calendarType: "solar",
  leapMonthType: "regular",
};

export async function POST(request: Request) {
  const raw = await request.json().catch(() => ({}));
  const parsed = testInputSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid request body",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const input: NormalizedSajuInput = {
    ...defaultInput,
    ...(parsed.data ?? {}),
  };

  try {
    const data = await fetchAblecitySaju(input);
    return NextResponse.json({
      ok: true,
      provider: "ablecity",
      requestInput: input,
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        provider: "ablecity",
        requestInput: input,
        error: message,
      },
      { status: 502 }
    );
  }
}
