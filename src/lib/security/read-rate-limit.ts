import "server-only";
import { createHash } from "node:crypto";
import { createLoginRequestLimiter, loginClientAddress } from "./login-rate-limit";
import { RequestSecurityError } from "./request";

export const READ_WINDOW_MS = 60_000;
export const READ_ACCOUNT_LIMIT = 180;
export const READ_LEASE_SIZE = 10;
const limited = (seconds: number) => new RequestSecurityError(429, "요청이 잠깐 몰렸어. 조금 뒤에 다시 연결할게.", Math.max(1, seconds));

/** No identity cache: admitted requests still verify revocation and the session
 * allowlist. Untrusted cookie/IP values can never allocate Firestore documents. */
export function createReadAdmission(now = () => performance.now()) {
  const ipBurst = createLoginRequestLimiter({ limit: 180, windowMs: 10_000, now });
  const ipWindow = createLoginRequestLimiter({ limit: 600, windowMs: READ_WINDOW_MS, now });
  const sessionBurst = createLoginRequestLimiter({ limit: 60, windowMs: 10_000, now });
  const sessionWindow = createLoginRequestLimiter({ limit: READ_ACCOUNT_LIMIT, windowMs: READ_WINDOW_MS, now });
  return (session: string, request: Pick<Request, "headers">) => {
    const ip = loginClientAddress(request);
    const key = createHash("sha256").update(session).digest("hex");
    for (const [consume, value] of [[ipBurst, ip], [ipWindow, ip], [sessionBurst, key], [sessionWindow, key]] as const) {
      const result = consume(value);
      if (!result.allowed) throw limited(result.retryAfter);
    }
  };
}

type Lease = { credits: number; resetAt: number };
type Reserve = (accountId: string) => Promise<Lease>;

/** Reserve a small batch atomically across instances. A process restart loses
 * unused credits, never restores spent ones. Only quota credits are cached. */
export function createAccountReadLimiter(reserve: Reserve, now = Date.now, maxEntries = 10_000) {
  const buckets = new Map<string, Lease & { pending?: Promise<void> }>();
  return async (accountId: string) => {
    for (const [key, value] of buckets) if (value.resetAt <= now() && !value.pending) buckets.delete(key);
    let bucket = buckets.get(accountId);
    if (!bucket) {
      if (buckets.size >= maxEntries) throw limited(60);
      bucket = { credits: 0, resetAt: 0 };
      buckets.set(accountId, bucket);
    }
    // A single replenishment per account per process, even for concurrent GETs.
    while (true) {
      if (bucket.resetAt > now()) {
        if (bucket.credits > 0) { bucket.credits--; return; }
        if (bucket.credits === -1) throw limited(Math.ceil((bucket.resetAt - now()) / 1000));
      }
      if (!bucket.pending) {
        bucket.pending = reserve(accountId).then(lease => {
          if (!Number.isSafeInteger(lease.credits) || lease.credits < 0 || lease.credits > READ_LEASE_SIZE || !Number.isFinite(lease.resetAt) || lease.resetAt <= now()) throw new Error("INVALID_READ_QUOTA");
          bucket!.credits = lease.credits || -1;
          bucket!.resetAt = lease.resetAt;
        }).catch(() => {
          // An unavailable quota store must not admit reads or trigger a DB storm.
          bucket!.credits = -1;
          bucket!.resetAt = now() + 5_000;
        }).finally(() => { bucket!.pending = undefined; });
      }
      await bucket.pending;
    }
  };
}

export const admitSessionRead = createReadAdmission();
