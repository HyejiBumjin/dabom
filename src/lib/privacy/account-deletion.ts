import "server-only";
import { Timestamp, type DocumentData, type Query } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";
import { FirebaseStore } from "@/lib/firebase/store";
import { afterDays, afterYears, RETENTION } from "./retention";

type DeletionAuth = Pick<Auth, "updateUser" | "revokeRefreshTokens" | "deleteUser">;
const ownedCollections = ["profiles", "reports", "orders", "checkoutConsents"] as const;
const uidPattern = /^kakao_\d{1,24}$/;
const casePattern = /^[A-Za-z0-9_-]{8,80}$/;
function validate(uid: string, caseId: string) {
  if (!uidPattern.test(uid) || !casePattern.test(caseId)) throw new Error("INVALID_DELETION_REQUEST");
}
function pick(data: DocumentData, keys: string[]) {
  return Object.fromEntries(keys.filter(key => data[key] !== undefined).map(key => [key, data[key]]));
}
function date(value: unknown): Date | null {
  const converted = value instanceof Timestamp ? value.toDate() : value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
  return converted && Number.isFinite(converted.getTime()) ? converted : null;
}
const consentFields = ["version", "acceptedAt", "terms", "digitalContent", "termsText", "digitalContentText", "productName", "amount", "sampleVersion"];

/** Deliberate allow-list: no name, birth input, chart, report body or profile ID. */
export function legalOrderRecord(orderId: string, order: DocumentData, consents: DocumentData[], reports: DocumentData[], now = new Date()) {
  const receiptFields = ["status", "completedAt", "firstDeliveredAt", "firstOpenedAt"];
  const receipts = reports.map(data => pick(data, receiptFields));
  const evidence = (consents.length ? consents : order.checkoutConsent ? [order.checkoutConsent] : []).map(data => pick(data, consentFields));
  const times = [order.createdAt, order.paidAt, order.cancelledAt, ...evidence.map(c => c.acceptedAt), ...reports.flatMap(r => [r.completedAt, r.firstDeliveredAt, r.firstOpenedAt])].map(date).filter((d): d is Date => !!d);
  if (!times.length || times.some(d => d > now)) throw new Error("INVALID_TRANSACTION_DATES");
  const anchor = new Date(Math.max(...times.map(d => d.getTime())));
  const purchased = Boolean(order.paidAt || order.paidAmount || ["PAID", "CANCELLED"].includes(order.status) || reports.some(r => r.firstDeliveredAt));
  return {
    orderId, accountId: order.userId,
    ...pick(order, ["productCode", "merchantUid", "status", "amount", "paidAmount", "paidAt", "pgTxId", "createdAt", "cancelledAt"]),
    consents: evidence, receipts, archivedAt: now,
    retentionClass: purchased ? "transaction" : "abandoned-checkout",
    // An operator must explicitly release a legal hold after reviewing its basis.
    legalHold: order.legalHold === true,
    purgeAt: order.legalHold === true ? null : purchased ? afterYears(anchor, RETENTION.transactionYears) : afterDays(anchor, RETENTION.abandonedCheckoutDays),
  };
}

export async function accountDeletionPlan(stores: FirebaseStore[], uid: string) {
  if (!uidPattern.test(uid)) throw new Error("INVALID_IDENTITY");
  return Promise.all(stores.map(async store => ({
    namespace: store.collection("users").path,
    accountPresent: (await store.collection("users").doc(uid).get()).exists,
    counts: Object.fromEntries(await Promise.all(ownedCollections.map(async name => [name, (await store.collection(name).where("userId", "==", uid).count().get()).data().count]))),
    sessions: (await store.collection("sessions").where("uid", "==", uid).count().get()).data().count,
  })));
}

async function deleteQuery(store: FirebaseStore, query: Query) {
  for (;;) {
    const page = await query.limit(150).get();
    if (page.empty) return;
    await store.transaction(async tx => { for (const doc of page.docs) tx.delete(doc.ref); });
  }
}
async function ignoreMissingUser(action: () => Promise<unknown>) {
  try { await action(); } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "auth/user-not-found")) throw error;
  }
}

/** Operator-only, after verified ownership and provider/refund review. Never an HTTP endpoint.
 * Keep the same caseId on retry. Failures leave login/writes blocked, not half-enabled.
 * Both production and local payment-test namespaces MUST be supplied by the CLI.
 */
export async function eraseAccount(stores: FirebaseStore[], auth: DeletionAuth, uid: string, caseId: string) {
  validate(uid, caseId);
  if (!stores.length) throw new Error("MISSING_NAMESPACES");
  const primary = stores[0];
  const job = primary.collection("privacyJobs").doc(caseId);
  const previous = (await job.get()).data();
  if (previous && previous.userId !== uid) throw new Error("CASE_OWNER_MISMATCH");
  if (previous?.status === "COMPLETED") return { alreadyCompleted: true };
  // One database transaction locks every namespace before disabling Firebase Auth.
  await primary.transaction(async tx => {
    const existingJob = (await tx.get(job)).data();
    const users = await Promise.all(stores.map(store => tx.get(store.collection("users").doc(uid))));
    const requests = await Promise.all(stores.map(store => tx.get(store.collection("serviceRequests").doc(caseId))));
    const request = requests.find(doc => doc.exists);
    if (!request || request.get("userId") !== uid || request.get("kind") !== "ACCOUNT_DELETE" || request.get("deletionAcknowledged") !== true || !["OPEN", "PROCESSING"].includes(request.get("status"))) throw new Error("VERIFIED_DELETION_REQUEST_REQUIRED");
    const requestStoreIndex = requests.indexOf(request);
    const accountCreatedAt = date(users[requestStoreIndex].get("createdAt"));
    if (!accountCreatedAt || accountCreatedAt.getTime() !== date(request.get("accountCreatedAt"))?.getTime()) throw new Error("ACCOUNT_CHANGED");
    if (existingJob && (existingJob.userId !== uid || existingJob.status === "COMPLETED")) throw new Error("CASE_CHANGED");
    if (!users.some(user => user.exists) && !existingJob) throw new Error("ACCOUNT_NOT_FOUND");
    for (const user of users) {
      if (user.get("deletionPending") && user.get("deletionCaseId") !== caseId) throw new Error("DELETION_ALREADY_RUNNING");
    }
    // A placeholder also blocks a concurrent first login in the other namespace.
    for (const user of users) tx.set(user.ref, { deletionPending: true, deletionCaseId: caseId }, { merge: true });
    tx.update(request.ref, { status: "PROCESSING" });
    // Keep the account generation with the deletion receipt. A restored backup
    // must not mistake a later re-registration for the deleted account.
    const accounts = users.map(user => ({ namespace: user.ref.parent.id, createdAt: user.get("createdAt") ?? null, dataEpoch: user.get("dataEpoch") ?? null }));
    tx.set(job, { userId: uid, status: "PENDING", startedAt: existingJob?.startedAt ?? new Date(), accounts: existingJob?.accounts ?? accounts, purgeAt: null });
  });
  await ignoreMissingUser(() => auth.updateUser(uid, { disabled: true }));
  await ignoreMissingUser(() => auth.revokeRefreshTokens(uid));
  for (const store of stores) {
    await deleteQuery(store, store.collection("sessions").where("uid", "==", uid));
    for (;;) {
      const orders = await store.collection("orders").where("userId", "==", uid).limit(50).get();
      if (orders.empty) break;
      for (const item of orders.docs) {
        await store.transaction(async tx => {
          const order = await tx.get(item.ref);
          if (!order.exists) return;
          if (order.get("userId") !== uid) throw new Error("ORDER_OWNER_MISMATCH");
          const [consents, reports] = await Promise.all([
            tx.get(store.collection("checkoutConsents").where("orderId", "==", order.id)),
            tx.get(store.collection("reports").where("orderId", "==", order.id)),
          ]);
          if ([...consents.docs, ...reports.docs].some(d => d.get("userId") !== uid)) throw new Error("EVIDENCE_OWNER_MISMATCH");
          const archive = store.collection("legalRecords").doc(order.id);
          const prior = await tx.get(archive);
          if (prior.exists) throw new Error("ARCHIVE_COLLISION");
          tx.create(archive, { ...legalOrderRecord(order.id, order.data()!, consents.docs.map(d => d.data()), reports.docs.map(d => d.data())), deletionCaseId: caseId });
          tx.delete(order.ref);
        });
      }
    }
    // All financial evidence is durable before deleting the content it references.
    for (const name of ["reports", "profiles", "checkoutConsents"]) await deleteQuery(store, store.collection(name).where("userId", "==", uid));
  }
  // Auth deletion precedes releasing the account lock. Old sessions are already gone.
  await ignoreMissingUser(() => auth.deleteUser(uid));
  await primary.transaction(async tx => {
    const users = await Promise.all(stores.map(store => tx.get(store.collection("users").doc(uid))));
    const requests = await Promise.all(stores.map(store => tx.get(store.collection("serviceRequests").doc(caseId))));
    if (users.some(user => user.get("deletionCaseId") !== caseId)) throw new Error("DELETION_LOCK_LOST");
    for (const user of users) tx.delete(user.ref);
    const completedAt = new Date();
    tx.update(job, { status: "COMPLETED", completedAt, purgeAt: afterYears(completedAt, RETENTION.complaintYears) });
    for (const request of requests) if (request.exists) tx.update(request.ref, { status: "CLOSED", outcome: "ACCOUNT_DELETED", closedAt: completedAt, purgeAt: request.get("legalHold") === true ? null : afterYears(completedAt, RETENTION.complaintYears) });
  });
  return { alreadyCompleted: false };
}
