import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const callbackQuerySchema = z.object({
  code: z.string().min(1),
  next: z.string().optional(),
});

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const parsed = callbackQuerySchema.safeParse({
    code: searchParams.get("code"),
    next: searchParams.get("next") ?? "/",
  });
  if (!parsed.success) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }
  const { code, next } = parsed.data;

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=config`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
