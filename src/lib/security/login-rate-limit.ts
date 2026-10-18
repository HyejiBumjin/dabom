import "server-only";
import { isIP } from "node:net";

export const LOGIN_REQUEST_LIMIT = 30;
export const LOGIN_REQUEST_WINDOW_MS = 600_000;

type LoginProxy = "vercel" | "firebase-app-hosting" | "direct";

function loginProxy(): LoginProxy {
  if (process.env.DABOM_HOSTING === "firebase-app-hosting" && process.env.K_SERVICE === "dabom") return "firebase-app-hosting";
  return process.env.VERCEL === "1" ? "vercel" : "direct";
}

/** App Hosting appends client, load balancer, then GFE to any untrusted prefix.
 * Verified against both spoofed headers and the IAM-protected Run origin.
 * Pin the managed load balancers: a topology change fails closed to one bucket.
 * Never trust the first XFF entry, X-Real-IP, or Fastly-Client-IP. */
export function loginClientAddress(request: Request, proxy: LoginProxy = loginProxy(), loadBalancerIps = process.env.DABOM_APPHOSTING_LB_IPS) {
  if (proxy === "direct") return "untrusted-client";
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded || forwarded.length > 4096) return "untrusted-client";
  let address = forwarded.trim();
  if (proxy === "firebase-app-hosting") {
    const tail = forwarded.split(",").slice(-3).map(value => value.trim());
    const allowedBalancers = loadBalancerIps?.split(",").map(value => value.trim()) ?? [];
    if (tail.length !== 3 || !tail.every(value => value.length <= 45 && isIP(value)) || !allowedBalancers.includes(tail[1])) return "untrusted-client";
    address = tail[0];
  }
  if (!address || address.length > 45 || !isIP(address)) return "untrusted-client";
  return isIP(address) === 6 ? new URL(`http://[${address}]`).hostname : address;
}

/** Cheap per-process protection, not a distributed quota. The existing
 * Firestore counter still enforces the shared limit across server instances. */
export function createLoginRequestLimiter({
  limit = LOGIN_REQUEST_LIMIT,
  windowMs = LOGIN_REQUEST_WINDOW_MS,
  maxEntries = 10_000,
  now = () => performance.now(),
} = {}) {
  if (![limit, windowMs, maxEntries].every(value => Number.isSafeInteger(value) && value > 0)) throw new Error("Invalid login request limit");
  const buckets = new Map<string, { hits: number; resetAt: number }>();
  return (address: string) => {
    const time = now();
    // Entries keep insertion/expiry order. No timers or unbounded IP storage.
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt > time) break;
      buckets.delete(key);
    }
    let bucket = buckets.get(address);
    if (!bucket) {
      if (buckets.size >= maxEntries) {
        // Never evict an active limit: cycling new keys must not reset it.
        const oldest = buckets.values().next().value!;
        return { allowed: false, retryAfter: Math.max(1, Math.ceil((oldest.resetAt - time) / 1000)) };
      }
      bucket = { hits: 0, resetAt: time + windowMs };
      buckets.set(address, bucket);
    }
    if (bucket.hits >= limit) {
      return { allowed: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - time) / 1000)) };
    }
    // Reserve synchronously before the caller awaits Firestore/OAuth.
    bucket.hits++;
    return { allowed: true, retryAfter: 0 };
  };
}

export const limitLoginRequest = createLoginRequestLimiter();
