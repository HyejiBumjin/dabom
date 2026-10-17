import { loadEnvConfig } from "@next/env";
import { randomUUID } from "node:crypto";
import { deleteApp } from "firebase-admin/app";
import { getFirebaseAdminApp, getFirebaseAdminAuth, getFirebaseAdminFirestore } from "../src/lib/firebase/admin";

loadEnvConfig(process.cwd(), true);

async function main() {
  const app = getFirebaseAdminApp();
  const db = getFirebaseAdminFirestore();
  try {
    // Read only one entry, and never print user records or credentials.
    await getFirebaseAdminAuth().listUsers(1);
    console.log("PASS: Firebase Authentication server access");

    const probe = db.collection("_connection_checks").doc(randomUUID());
    await probe.get();
    console.log("PASS: Firestore server read access");

    if (process.argv.includes("--write-test")) {
      let created = false;
      try {
        await probe.create({ purpose: "server-connection-check", createdAt: new Date() });
        created = true;
        const stored = await probe.get();
        if (stored.get("purpose") !== "server-connection-check") throw new Error("Probe verification failed.");
        console.log("PASS: Firestore write and read-back (synthetic data only)");
      } finally {
        if (created) {
          await probe.delete();
          console.log("PASS: Temporary connection-check document removed");
        }
      }
    }
    console.log(`Connected to Firebase project: ${app.options.projectId}`);
  } finally {
    await db.terminate();
    await deleteApp(app);
  }
}

main().catch((error: unknown) => {
  // SDK errors can carry request metadata. Report only a constrained error code.
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "configuration-or-connection";
  console.error(`Firebase connection check failed (${/^[a-zA-Z0-9_/-]+$/.test(code) ? code : "unknown"}).`);
  process.exitCode = 1;
});
