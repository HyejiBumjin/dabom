import { loadEnvConfig } from "@next/env";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "../src/lib/firebase/admin";
import { FirebaseStore } from "../src/lib/firebase/store";
import { accountDeletionPlan, eraseAccount } from "../src/lib/privacy/account-deletion";

loadEnvConfig(process.cwd(), true);
const args = process.argv.slice(2);
const value = (name: string) => args[args.indexOf(name) + 1];
async function main() {
  if (process.env.FIREBASE_PROJECT_ID !== "dabom-10a35" || process.env.FIRESTORE_EMULATOR_HOST) throw new Error("PROJECT_MISMATCH");
  if (!args.includes("--uid")) throw new Error("Use --uid kakao_ID (dry run by default)");
  const uid = value("--uid");
  const db = getFirebaseAdminFirestore();
  const stores = [new FirebaseStore(() => db), new FirebaseStore(() => db, "payment_test_")];
  try {
    const plan = await accountDeletionPlan(stores, uid);
    console.log(JSON.stringify({ mode: args.includes("--apply") ? "apply" : "dry-run", plan }, null, 2));
    if (!args.includes("--apply")) return;
    if (!args.includes("--confirm-uid") || value("--confirm-uid") !== uid || !args.includes("--case-id") || !args.includes("--identity-verified") || !args.includes("--payments-reviewed")) {
      throw new Error("Deletion requires --confirm-uid, --case-id, --identity-verified and --payments-reviewed. Read docs/privacy/operations.md first.");
    }
    console.log(await eraseAccount(stores, getFirebaseAdminAuth(), uid, value("--case-id")));
    console.log(JSON.stringify({ after: await accountDeletionPlan(stores, uid) }));
  } finally { await db.terminate(); }
}
main().catch(error => { console.error("Privacy operation stopped:", error instanceof Error && /^(PROJECT_MISMATCH|INVALID_|ACCOUNT_|CASE_|DELETION_|EVIDENCE_|ARCHIVE_|ORDER_|Use |Deletion requires)/.test(error.message) ? error.message : "Operation failed; secrets/customer content withheld. Resume with the same case ID after inspection."); process.exitCode = 1; });
