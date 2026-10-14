import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { guardedMutation } from "@/lib/security/request";

export async function POST(request: Request) {
  return guardedMutation(request, async () => {
  const supabase = await createClient();
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) return NextResponse.json({ error: "로그아웃을 완료하지 못했어. 다시 시도해줘." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
  });
}
