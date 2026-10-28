import { loadEnvConfig } from "@next/env";
import { getFirebaseAdminFirestore } from "../src/lib/firebase/admin";
import { afterYears, RETENTION } from "../src/lib/privacy/retention";
loadEnvConfig(process.cwd(), true);
async function main() {
  if (process.env.FIREBASE_PROJECT_ID !== "dabom-10a35") throw new Error("PROJECT_MISMATCH");
  const db = getFirebaseAdminFirestore();
  const args = process.argv.slice(2);
  const namespace = args.includes("--test") ? "payment_test_" : "";
  const collection = db.collection(namespace + "serviceRequests");
  try {
    if (args.includes("--close")) {
      const caseId = args[args.indexOf("--close") + 1];
      const outcome = args.includes("--outcome") ? args[args.indexOf("--outcome") + 1] : "";
      if (!/^support_[a-f0-9]{32}$/.test(caseId) || !["REFUNDED", "DECLINED_WITH_REASON", "WITHDRAWN", "RESOLVED"].includes(outcome)) throw new Error("INVALID_CLOSE_ARGUMENTS");
      if (!args.includes("--customer-notified")) throw new Error("CUSTOMER_NOTIFICATION_REQUIRED");
      await db.runTransaction(async tx => {
        const ref = collection.doc(caseId), snapshot = await tx.get(ref);
        if (!snapshot.exists) throw new Error("REQUEST_NOT_FOUND");
        if (snapshot.get("status") === "CLOSED") return;
        if (snapshot.get("status") === "PROCESSING") throw new Error("DELETION_IN_PROGRESS");
        if (snapshot.get("kind") === "ACCOUNT_DELETE" && outcome !== "WITHDRAWN") throw new Error("USE_ACCOUNT_DELETION_WORKFLOW");
        const closedAt = new Date();
        tx.update(ref, { status: "CLOSED", outcome, closedAt, purgeAt: snapshot.get("legalHold") === true ? null : afterYears(closedAt, RETENTION.complaintYears) });
      });
      console.log("Support request closed. This command does not cancel a payment or send a message.");
      return;
    }
    const queue = await collection.where("status", "in", ["OPEN", "PROCESSING"]).orderBy("createdAt", "asc").limit(100).get();
    console.log(JSON.stringify({ namespace, limitedTo: 100, requests: queue.docs.map(d => ({ requestId: d.id, userId: d.get("userId"), kind: d.get("kind"), orderId: d.get("orderId"), status: d.get("status"), createdAt: d.get("createdAt")?.toDate().toISOString() })) }, null, 2));
  } finally { await db.terminate(); }
}
main().catch(error => { console.error("Support operation stopped:", error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : "Check configuration; sensitive error details withheld."); process.exitCode = 1; });
