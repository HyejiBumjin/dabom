import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { beginKakaoLogin, firebaseAuthConfigured, oauthCookieName, sessionCookieOptions } from "@/lib/firebase/auth";
import { privateJson, securityErrorResponse } from "@/lib/security/request";
import { enforceAccountRateLimit } from "@/lib/security/rate-limit";
import { limitLoginRequest, loginClientAddress, LOGIN_REQUEST_LIMIT, LOGIN_REQUEST_WINDOW_MS } from "@/lib/security/login-rate-limit";

export async function GET(request: Request) {
  if (!firebaseAuthConfigured()) return privateJson({ error: "로그인 설정을 준비 중이야." }, 503);
  try {
    const address = loginClientAddress(request);
    const admission = limitLoginRequest(address);
    if (!admission.allowed) return privateJson({ error: "로그인 요청이 많아. 잠시 뒤 다시 시도해줘." }, 429, { "Retry-After": String(admission.retryAfter) });
    await enforceAccountRateLimit(address, "oauth-start", LOGIN_REQUEST_LIMIT, LOGIN_REQUEST_WINDOW_MS);
    const result = await beginKakaoLogin(new URL(request.url).searchParams.get("next") ?? "/", (await cookies()).get(oauthCookieName())?.value);
    const response = NextResponse.redirect(result.url);
    response.cookies.set(oauthCookieName(), result.cookie, { ...sessionCookieOptions(), maxAge: 600 });
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) { return securityErrorResponse(error); }
}
