import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { safeReturnPath } from "@/lib/auth-return-path";

export async function GET(request: Request) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const next = safeReturnPath(new URL(request.url).searchParams.get("next"));
  const callback = new URL("/api/auth/callback", env.APP_URL);
  callback.searchParams.set("next", next);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: {
      redirectTo: callback.toString(),
    },
  });

  if (error) {
    return NextResponse.json({ error: "로그인을 시작하지 못했어. 잠시 뒤 다시 시도해줘." }, { status: 503 });
  }

  return NextResponse.redirect(data.url!);
}
