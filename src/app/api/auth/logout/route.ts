import { cookies } from "next/headers";
import { revokeCurrentSession, sessionCookieName, oauthCookieName, sessionCookieOptions } from "@/lib/firebase/auth";
import { guardedMutation, privateJson } from "@/lib/security/request";

export async function POST(request: Request) {
  return guardedMutation(request, async () => {
    await revokeCurrentSession((await cookies()).get(sessionCookieName())?.value);
    const response = privateJson({ ok: true });
    for (const name of [sessionCookieName(), oauthCookieName()]) response.cookies.set(name, "", { ...sessionCookieOptions(), maxAge: 0 });
    return response;
  });
}
