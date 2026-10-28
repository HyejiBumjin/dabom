import "server-only";
import { z } from "zod";
import { FirebaseStore, stableId } from "@/lib/firebase/store";

export const serviceRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ACCOUNT_DELETE"), requestKey: z.uuid(), deletionAcknowledged: z.literal(true) }).strict(),
  z.object({ kind: z.literal("REFUND"), requestKey: z.uuid(), orderId: z.string().regex(/^saju_[A-Za-z0-9_-]{1,75}$/).optional() }).strict(),
]);
export async function createServiceRequest(store: FirebaseStore, uid: string, input: unknown) {
  const data = serviceRequestSchema.parse(input);
  return store.transaction(async tx => {
    const account = await store.requireActiveAccount(uid, tx);
    const id = `support_${stableId(uid, account.createdAt.toISOString(), data.requestKey).slice(0, 32)}`;
    const ref = store.collection("serviceRequests").doc(id);
    const prior = await tx.get(ref);
    if (prior.exists) {
      if (prior.get("kind") !== data.kind || (prior.get("orderId") ?? null) !== ("orderId" in data ? data.orderId ?? null : null)) throw new Error("REQUEST_KEY_REUSED");
      return id;
    }
    if (data.kind === "REFUND" && data.orderId) {
      const order = await store.read<{ userId: string }>("orders", data.orderId, tx);
      if (!order || order.userId !== uid) throw new Error("ORDER_NOT_FOUND");
    }
    tx.create(ref, { userId: uid, accountCreatedAt: account.createdAt, kind: data.kind,
      orderId: data.kind === "REFUND" ? data.orderId ?? null : null,
      deletionAcknowledged: data.kind === "ACCOUNT_DELETE", status: "OPEN", createdAt: new Date(), purgeAt: null });
    return id;
  });
}
