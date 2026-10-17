import { loadEnvConfig } from "@next/env";
import { getFirebaseAdminFirestore } from "../src/lib/firebase/admin";
loadEnvConfig(process.cwd(), true);
async function main() {
  const db = getFirebaseAdminFirestore();
  try {
    const ref = db.collection("products").doc("yearly_2026");
    await db.runTransaction(async tx => {
      if (!(await tx.get(ref)).exists) tx.create(ref, {code:"yearly_2026",name:"2026년 올해 운세",price:3900,active:true});
    });
    console.log("PASS Firebase yearly product ready (existing price preserved)");
  } finally { await db.terminate(); }
}
main().catch(() => {console.error("Firebase product initialization failed; details withheld.");process.exitCode=1;});
