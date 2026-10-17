import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { beginKakaoLogin, firebaseAuthConfigured, oauthCookieName, sessionCookieOptions } from "@/lib/firebase/auth";
import { privateJson, securityErrorResponse } from "@/lib/security/request";
import { enforceAccountRateLimit } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  if (!firebaseAuthConfigured()) return privateJson({ error: "로그인 설정을 준비 중이야." }, 503);
  try {
    // Vercel overwrites x-forwarded-for with the actual connecting address.
    const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    await enforceAccountRateLimit(address, "oauth-start", 30, 600_000);
    const result = await beginKakaoLogin(new URL(request.url).searchParams.get("next") ?? "/saju/library", (await cookies()).get(oauthCookieName())?.value);
    const response = NextResponse.redirect(result.url);
    response.cookies.set(oauthCookieName(), result.cookie, { ...sessionCookieOptions(), maxAge: 600 });
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) { return securityErrorResponse(error); }
}
