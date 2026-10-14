import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { privateJson, securityErrorResponse } from "@/lib/security/request";

/** Read-only identity check for revoking private UI in other tabs/BFCache. */
export async function GET() {
  try {
    const supabase = await createClient();
    if (!supabase) return privateJson({ error: "로그인이 필요해." }, 401);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error?.name === "AuthRetryableFetchError" || error && (error.status ?? 0) >= 500) return privateJson({ error: "로그인 상태를 확인하지 못했어. 잠시 뒤 다시 확인해줘." }, 503);
    if (error || !user || user.is_anonymous) return privateJson({ error: "로그인이 필요해." }, 401);
    const account = await prisma.user.findUnique({ where: { kakaoId: user.id }, select: { id: true } });
    if (!account) return privateJson({ error: "로그인이 필요해." }, 401);
    return privateJson({ accountId: account.id });
  } catch (error) { return securityErrorResponse(error); }
}
