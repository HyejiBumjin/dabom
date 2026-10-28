import "server-only";
import { FieldPath, Timestamp, type DocumentData, type Firestore, type QueryDocumentSnapshot } from "firebase-admin/firestore";

export function recoveryTime(value: unknown): number | null {
  const time = value instanceof Timestamp ? value.toMillis() : value instanceof Date ? value.getTime() : typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : null;
}

/** Only a newer, live account with the SAME generation may survive a past deletion. */
export function recoveredAccountAction(job: DocumentData, restored: DocumentData | undefined, live: DocumentData | undefined): "erase" | "keep" {
  const started = recoveryTime(job.startedAt);
  if (!/^kakao_\d{1,24}$/.test(job.userId) || !["PENDING", "COMPLETED"].includes(job.status) || started === null) throw new Error("INVALID_DELETION_LEDGER");
  if (!restored) return "erase";
  const created = recoveryTime(restored.createdAt);
  if (created === null) throw new Error("RESTORED_ACCOUNT_DATE_MISSING");
  if (created <= started) return "erase";
  if (job.status !== "COMPLETED" || restored.deletionPending || live?.deletionPending || !restored.dataEpoch || restored.dataEpoch !== live?.dataEpoch || created !== recoveryTime(live?.createdAt)) throw new Error("REJOIN_REQUIRES_REVIEW");
  return "keep";
}

const namespaces = ["", "payment_test_"];
const ephemeral = ["sessions", "oauthAttempts", "rateLimits"];
const owned = ["profiles", "reports", "orders", "checkoutConsents"];
const evidence = ["privacyJobs", "serviceRequests", "legalRecords"];
async function documents(db: Firestore, name: string) {
  const result: QueryDocumentSnapshot[] = [];
  let cursor: QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = db.collection(name).orderBy(FieldPath.documentId()).limit(200);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (page.empty) break;
    result.push(...page.docs); cursor = page.docs.at(-1);
  }
  return result;
}
async function eraseQuery(db: Firestore, query: FirebaseFirestore.Query) {
  let count = 0;
  for (;;) {
    const page = await query.limit(200).get();
    if (page.empty) return count;
    const batch = db.batch();
    for (const doc of page.docs) batch.delete(doc.ref);
    await batch.commit(); count += page.size;
  }
}
async function ledgerFingerprint(db: Firestore) {
  const { createHash } = await import("node:crypto");
  const hash = createHash("sha256");
  for (const prefix of namespaces) for (const name of [...evidence, "users"]) {
    for (const doc of await documents(db, prefix + name)) hash.update(doc.ref.path + ":" + doc.updateTime?.toMillis() + ":" + JSON.stringify(doc.data()));
  }
  return hash.digest("hex");
}

/** Operator-only. No production write, Auth call, payment call, model call or promotion. */
export async function sanitizeRecoveredDatabase(source: Firestore, target: Firestore, apply: boolean) {
  if (source.databaseId !== "(default)" || !/^dabom-restore-[a-z0-9-]{4,40}$/.test(target.databaseId)) throw new Error("UNSAFE_RECOVERY_TARGET");
  const before = await ledgerFingerprint(source); // Unreachable live ledger => stop, not an empty deletion list.
  const jobs = (await Promise.all(namespaces.map(prefix => documents(source, prefix + "privacyJobs")))).flat();
  const now = Date.now();
  const stats = { deletionCases: jobs.length, accountsErased: 0, rejoinedAccountsKept: 0, documentsErased: 0, evidenceSynced: 0, ephemeralErased: 0, expiredErased: 0 };
  // Plan ALL decisions before changing even the isolated database.
  const plans = [];
  for (const job of jobs) for (const prefix of namespaces) {
    const data = job.data();
    const [restored, live] = await Promise.all([target.collection(prefix + "users").doc(data.userId).get(), source.collection(prefix + "users").doc(data.userId).get()]);
    const action = recoveredAccountAction(data, restored.data(), live.data());
    plans.push({ prefix, uid: data.userId, action, exists: restored.exists });
  }
  if (!apply) {
    const ephemeralCounts = await Promise.all(namespaces.flatMap(prefix => ephemeral.map(async name => [prefix + name, (await target.collection(prefix + name).count().get()).data().count] as const)));
    return { mode: "dry-run", deletionCases: jobs.length, plannedAccountRemovals: plans.filter(p => p.action === "erase" && p.exists).length, ephemeralToErase: Object.fromEntries(ephemeralCounts), status: "NOT_APPLIED" };
  }
  await target.doc("_recovery/inspection").set({ status: "IN_PROGRESS", startedAt: new Date(), liveLedgerFingerprint: before });
  for (const prefix of namespaces) {
    for (const name of ephemeral) stats.ephemeralErased += await eraseQuery(target, target.collection(prefix + name));
    // Latest retained financial/support evidence wins over an old snapshot.
    for (const name of evidence) for (const doc of await documents(source, prefix + name)) {
      await target.doc(doc.ref.path).set(doc.data()); stats.evidenceSynced++;
    }
  }
  for (const plan of plans) {
    if (plan.action === "keep") { stats.rejoinedAccountsKept++; continue; }
    stats.documentsErased += await eraseRecoveredAccount(target, plan.prefix, plan.uid);
    if (plan.exists) stats.accountsErased++;
  }
  for (const prefix of namespaces) for (const name of evidence) for (const doc of await documents(target, prefix + name)) {
    const data = doc.data(), expires = recoveryTime(data.purgeAt);
    if (data.legalHold !== true && expires !== null && expires <= now) { await doc.ref.delete(); stats.expiredErased++; }
  }
  const after = await ledgerFingerprint(source);
  if (before !== after) {
    await target.doc("_recovery/inspection").set({ status: "LIVE_LEDGER_CHANGED_RERUN", checkedAt: new Date() }, { merge: true });
    throw new Error("LIVE_LEDGER_CHANGED_RERUN");
  }
  // Deliberately NOT READY: finance, IAM/rules, TTL and a final deletion delta
  // still require operator review during a controlled maintenance window.
  await target.doc("_recovery/inspection").set({ status: "REVIEW_REQUIRED", checkedAt: new Date(), stats, liveLedgerFingerprint: after });
  return { mode: "apply", ...stats, status: "REVIEW_REQUIRED" };
}

export async function eraseRecoveredAccount(target: Firestore, prefix: string, uid: string) {
  if (!/^dabom-restore-[a-z0-9-]{4,40}$/.test(target.databaseId) || !namespaces.includes(prefix) || !/^kakao_\d{1,24}$/.test(uid)) throw new Error("UNSAFE_RECOVERY_TARGET");
  let count = 0;
  for (const name of owned) count += await eraseQuery(target, target.collection(prefix + name).where("userId", "==", uid));
  await target.collection(prefix + "users").doc(uid).delete();
  return count;
}
