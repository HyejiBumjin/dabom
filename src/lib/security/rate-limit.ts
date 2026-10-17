import { firebaseStore, type FirebaseStore } from "@/lib/firebase/store";
import { RequestSecurityError } from "./request";

/** Transaction counter shared across all server instances. */
export async function enforceAccountRateLimit(accountId: string, scope: string, limit: number, windowMs: number, db: Pick<FirebaseStore, "consumeRateLimit"> = firebaseStore) {
  if (!await db.consumeRateLimit(accountId, scope, limit, windowMs)) throw new RequestSecurityError(429, "요청이 많아. 잠시 뒤 다시 시도해줘.");
}
