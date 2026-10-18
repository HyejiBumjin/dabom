import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { Auth } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { getFirebaseAdminAuth } from "./admin";
import { firebaseCredentialConfig } from "./credential-config";
import { firebaseStore, type FirebaseStore } from "./store";
import { safeReturnPath } from "@/lib/auth-return-path";
import { admitSessionRead, createAccountReadLimiter } from "@/lib/security/read-rate-limit";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const isProduction = () => process.env.NODE_ENV === "production";
export const sessionCookieName = () => isProduction() ? "__Host-dabom_session" : "dabom_session";
export const oauthCookieName = () => isProduction() ? "__Host-dabom_oauth" : "dabom_oauth";
export const sessionCookieOptions = () => ({ httpOnly: true, secure: isProduction(), sameSite: "lax" as const, path: "/" });
export const SESSION_SECONDS = 14 * 24 * 60 * 60;
export function firebaseAuthConfigured() {
  try { firebaseCredentialConfig(); } catch { return false; }
  return Boolean(process.env.FIREBASE_WEB_API_KEY && process.env.KAKAO_REST_API_KEY && process.env.KAKAO_CLIENT_SECRET);
}
export function authOrigin() {
  const origin = new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  if (isProduction() && origin.protocol !== "https:") throw new Error("HTTPS_APP_URL_REQUIRED");
  return origin.origin;
}
export const kakaoCallbackUrl = () => new URL("/api/auth/callback", authOrigin()).toString();

export async function beginKakaoLogin(next: string, previousCookie?: string) {
  if (!firebaseAuthConfigured()) throw new Error("AUTH_NOT_CONFIGURED");
  const state = randomBytes(32).toString("base64url");
  const binding = randomBytes(32).toString("base64url");
  const attempts = firebaseStore.collection("oauthAttempts");
  const oldState = previousCookie?.split(".")[0];
  // Removing an old attempt requires possession of its binding, not just a state ID.
  if (oldState) await consumeOAuthAttempt(oldState, previousCookie).catch(() => null);
  await attempts.doc(sha(state)).create({ binding: sha(binding), next: safeReturnPath(next), expiresAt: Timestamp.fromMillis(Date.now() + 600_000) });
  const expired = await attempts.where("expiresAt", "<", new Date()).limit(20).get();
  await Promise.all(expired.docs.map(doc => doc.ref.delete()));
  const url = new URL("https://kauth.kakao.com/oauth/authorize");
  url.search = new URLSearchParams({ response_type: "code", client_id: process.env.KAKAO_REST_API_KEY!, redirect_uri: kakaoCallbackUrl(), state }).toString();
  return { url: url.toString(), cookie: `${state}.${binding}` };
}

/** CSRF protection + one-use state; no code exchange happens before this succeeds. */
export async function consumeOAuthAttempt(state: string, cookie: string | undefined, store: FirebaseStore = firebaseStore) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(state) || !cookie || cookie.length > 200) return null;
  const [cookieState, binding, extra] = cookie.split(".");
  if (extra || cookieState !== state || !/^[A-Za-z0-9_-]{43}$/.test(binding ?? "")) return null;
  return store.transaction(async tx => {
    const ref = store.collection("oauthAttempts").doc(sha(state));
    const data = (await tx.get(ref)).data();
    if (!data || !(data.expiresAt instanceof Timestamp) || data.expiresAt.toMillis() <= Date.now() || typeof data.binding !== "string") return null;
    const actual = Buffer.from(sha(binding));
    const expected = Buffer.from(data.binding);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    tx.delete(ref);
    return { next: safeReturnPath(data.next) };
  });
}

const tokenSchema = z.object({ access_token: z.string().min(1).max(8192) });
const kakaoUserSchema = z.object({
  id: z.union([z.number().int().positive().max(Number.MAX_SAFE_INTEGER), z.string().regex(/^\d{1,24}$/)]),
  kakao_account: z.object({ profile: z.object({ nickname: z.string().max(200).optional() }).optional() }).optional(),
});
const idTokenSchema = z.object({ idToken: z.string().min(1).max(20000) });

async function providerJson(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error("AUTH_PROVIDER_FAILED");
  return response.json() as Promise<unknown>;
}

export async function finishKakaoLogin(code: string) {
  const token = tokenSchema.parse(await providerJson("https://kauth.kakao.com/oauth/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({ grant_type: "authorization_code", client_id: process.env.KAKAO_REST_API_KEY!, client_secret: process.env.KAKAO_CLIENT_SECRET!, redirect_uri: kakaoCallbackUrl(), code }),
  }));
  const user = kakaoUserSchema.parse(await providerJson("https://kapi.kakao.com/v2/user/me", {
    method: "POST", headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({ property_keys: JSON.stringify(["kakao_account.profile"]) }),
  }));
  const kakaoId = String(user.id);
  const uid = `kakao_${kakaoId}`;
  const nickname = (user.kakao_account?.profile?.nickname ?? "다봄 사용자").replace(/[\p{Cc}\p{Cf}]/gu, "").slice(0, 80) || "다봄 사용자";
  const auth = getFirebaseAdminAuth();
  let existing;
  try { existing = await auth.getUser(uid); }
  catch (error) { if ((error as { code?: string }).code !== "auth/user-not-found") throw new Error("AUTH_PROVIDER_FAILED"); }
  if (existing?.disabled) throw new Error("ACCOUNT_DISABLED");
  if (!existing) {
    try { await auth.createUser({ uid, displayName: nickname }); }
    catch (error) { if ((error as { code?: string }).code !== "auth/uid-already-exists") throw new Error("AUTH_PROVIDER_FAILED"); }
  }
  const customToken = await auth.createCustomToken(uid, { loginProvider: "kakao", loginSessionId: randomBytes(24).toString("base64url") });
  const signedIn = idTokenSchema.parse(await providerJson(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(process.env.FIREBASE_WEB_API_KEY!)}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  }));
  const verified = await auth.verifyIdToken(signedIn.idToken, true);
  if (verified.uid !== uid || verified.loginProvider !== "kakao" || Date.now() / 1000 - verified.auth_time > 300) throw new Error("INVALID_AUTH_IDENTITY");
  await firebaseStore.saveAccount(uid, kakaoId, nickname);
  const session = await auth.createSessionCookie(signedIn.idToken, { expiresIn: SESSION_SECONDS * 1000 });
  await firebaseStore.collection("sessions").doc(sha(session)).create({ uid, expiresAt: Timestamp.fromMillis(Date.now() + SESSION_SECONDS * 1000) });
  const expired = await firebaseStore.collection("sessions").where("expiresAt", "<", new Date()).limit(20).get();
  await Promise.all(expired.docs.map(doc => doc.ref.delete()));
  return session;
}

const invalidSessionCodes = new Set(["auth/argument-error", "auth/invalid-session-cookie", "auth/session-cookie-expired", "auth/session-cookie-revoked", "auth/user-disabled", "auth/user-not-found", "auth/invalid-id-token"]);
export async function verifyFirebaseSession(session: string | undefined, store: FirebaseStore = firebaseStore, auth?: Auth) {
  if (!session || session.length > 20_000) return null;
  try {
    const identity = await (auth ?? getFirebaseAdminAuth()).verifySessionCookie(session, true);
    if (identity.loginProvider !== "kakao" || !/^kakao_\d{1,24}$/.test(identity.uid) || identity.firebase.sign_in_provider !== "custom") return null;
    const active = (await store.collection("sessions").doc(sha(session)).get()).data();
    if (!active || active.uid !== identity.uid || !(active.expiresAt instanceof Timestamp) || active.expiresAt.toMillis() <= Date.now()) return null;
    const account = await store.getAccount(identity.uid);
    return account && account.id === `kakao_${account.kakaoId}` ? account : null;
  } catch (error) {
    if (invalidSessionCodes.has((error as { code?: string }).code ?? "")) return null;
    throw new Error("AUTH_TEMPORARILY_UNAVAILABLE");
  }
}
const limitAccountReads = createAccountReadLimiter(accountId => firebaseStore.reserveAccountReads(accountId));
export const getFirebaseAccount = cache(async () => {
  const session = (await cookies()).get(sessionCookieName())?.value;
  if (!session || session.length > 20_000) return null;
  admitSessionRead(session, { headers: await headers() });
  const account = await verifyFirebaseSession(session);
  if (account) await limitAccountReads(account.id);
  return account;
});

export async function revokeCurrentSession(session: string | undefined, store: FirebaseStore = firebaseStore) {
  // Removing the allowlist entry invalidates copied cookies immediately, including
  // tokens issued in the same second. Other devices keep their own sessions.
  if (session && session.length <= 20_000) await store.collection("sessions").doc(sha(session)).delete();
}
