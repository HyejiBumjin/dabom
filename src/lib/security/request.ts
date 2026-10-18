import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export class RequestSecurityError extends Error {
  constructor(public readonly status: number, message: string, public readonly retryAfter?: number, public readonly code?: "PAYMENT_VERIFICATION_REQUIRED") { super(message); }
}

/** Cookie-authenticated mutations must not be triggered by another website. */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  const allowed = new Set([new URL(env.APP_URL).origin]);
  const current = new URL(request.url);
  if (process.env.NODE_ENV === "development" && ["localhost", "127.0.0.1", "[::1]"].includes(current.hostname)) allowed.add(current.origin);
  if (site === "cross-site" || (origin !== null && !allowed.has(origin))) {
    throw new RequestSecurityError(403, "허용되지 않은 요청이야.");
  }
}

/** Bound the bytes before JSON parsing; Content-Length alone can be forged/omitted. */
export async function readRequestText(request: Request, maxBytes = 8192) {
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes)) throw new RequestSecurityError(413, "입력 내용이 너무 길어.");
  if (!request.body) throw new RequestSecurityError(400, "입력 내용을 확인해줘.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    deadlineTimer = setTimeout(() => reject(new RequestSecurityError(408, "입력 내용을 받는 시간이 초과됐어. 다시 시도해줘.")), 5000);
  });
  try {
    while (true) {
      const chunk = await Promise.race([reader.read(), expired]);
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new RequestSecurityError(413, "입력 내용이 너무 길어."); }
      chunks.push(chunk.value);
    }
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error;
  } finally { clearTimeout(deadlineTimer); reader.releaseLock(); }
  return Buffer.concat(chunks).toString("utf8");
}

export async function readJsonBody(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new RequestSecurityError(415, "JSON 형식으로 요청해줘.");
  const text = await readRequestText(request);
  try { return JSON.parse(text) as unknown; }
  catch { throw new RequestSecurityError(400, "입력 내용을 확인해줘."); }
}

export function privateJson(body: unknown, status = 200, headers?: HeadersInit) {
  const response = NextResponse.json(body, { status, headers });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export function securityErrorResponse(error: unknown) {
  return error instanceof RequestSecurityError
    ? privateJson({ error: error.message, ...(error.code ? { code: error.code } : {}) }, error.status, error.retryAfter ? { "Retry-After": String(error.retryAfter) } : undefined)
    : privateJson({ error: "요청을 처리하지 못했어. 잠시 뒤 다시 시도해줘." }, 503);
}

export async function guardedMutation(request: Request, action: () => Promise<Response>) {
  try {
    assertSameOrigin(request);
    const response = await action();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) { return securityErrorResponse(error); }
}
