import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/auth-return-path";
import { env } from "@/lib/env";

const callbackQuerySchema = z.object({
  code: z.string().min(1).max(2048),
  next: z.string().max(2048).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Trusted configuration, rather than a client-supplied Host/forwarded host.
  const origin = new URL(env.APP_URL).origin;
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
    const retry = new URL("/login", origin);
    retry.searchParams.set("error", "oauth");
    retry.searchParams.set("next", safeReturnPath(next));
    return NextResponse.redirect(retry);
  }

  return NextResponse.redirect(new URL(safeReturnPath(next), origin));
}
