import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authOrigin, consumeOAuthAttempt, finishKakaoLogin, oauthCookieName, SESSION_SECONDS, sessionCookieName, sessionCookieOptions } from "@/lib/firebase/auth";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  let response: NextResponse;
  try {
    const attempt = await consumeOAuthAttempt(query.get("state") ?? "", (await cookies()).get(oauthCookieName())?.value);
    const code = query.get("code");
    if (!attempt || !code || code.length > 2048 || query.has("error")) throw new Error("INVALID_CALLBACK");
    const session = await finishKakaoLogin(code);
    response = NextResponse.redirect(new URL(attempt.next, authOrigin()));
    response.cookies.set(sessionCookieName(), session, { ...sessionCookieOptions(), maxAge: SESSION_SECONDS });
  } catch {
    response = NextResponse.redirect(new URL("/login?error=oauth", authOrigin()));
  }
  response.cookies.set(oauthCookieName(), "", { ...sessionCookieOptions(), maxAge: 0 });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
