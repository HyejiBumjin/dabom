import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authOrigin, beginKakaoLogin, firebaseAuthConfigured, oauthCookieName, sessionCookieOptions } from "@/lib/firebase/auth";
import { safeReturnPath } from "@/lib/auth-return-path";
import { privateJson, securityErrorResponse } from "@/lib/security/request";
import { enforceAccountRateLimit } from "@/lib/security/rate-limit";
import { limitLoginRequest, loginClientAddress, LOGIN_REQUEST_LIMIT, LOGIN_REQUEST_WINDOW_MS } from "@/lib/security/login-rate-limit";

export async function GET(request: Request) {
  if (!firebaseAuthConfigured()) return privateJson({ error: "로그인 설정을 준비 중이야." }, 503);
  try {
    const requestUrl = new URL(request.url);
    // Next dev normalizes request.url to its bind address (e.g. 0.0.0.0).
    // Compare Host with the configured host; never use it as a redirect target.
    const configuredOrigin = new URL(authOrigin());
    const requestHost = request.headers.get("host") ?? requestUrl.host;
    if (process.env.NODE_ENV === "development" && (requestHost !== configuredOrigin.host || requestUrl.protocol !== configuredOrigin.protocol)) {
      const loginUrl = new URL("/api/auth/login", configuredOrigin);
      loginUrl.searchParams.set("next", safeReturnPath(requestUrl.searchParams.get("next")));
      const response = NextResponse.redirect(loginUrl);
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("Referrer-Policy", "no-referrer");
      return response;
    }
    const address = loginClientAddress(request);
    const admission = limitLoginRequest(address);
    if (!admission.allowed) return privateJson({ error: "로그인 요청이 많아. 잠시 뒤 다시 시도해줘." }, 429, { "Retry-After": String(admission.retryAfter) });
    await enforceAccountRateLimit(address, "oauth-start", LOGIN_REQUEST_LIMIT, LOGIN_REQUEST_WINDOW_MS);
    const result = await beginKakaoLogin(requestUrl.searchParams.get("next") ?? "/", (await cookies()).get(oauthCookieName())?.value);
    const response = NextResponse.redirect(result.url);
    response.cookies.set(oauthCookieName(), result.cookie, { ...sessionCookieOptions(), maxAge: 600 });
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) { return securityErrorResponse(error); }
}
