import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { loadEnvConfig } from "@next/env";
import { getFirebaseAdminApp } from "../src/lib/firebase/admin";
import { eraseRecoveredAccount, recoveredAccountAction, recoveryTime, sanitizeRecoveredDatabase } from "../src/lib/privacy/recovery";

let passed = 0;
function check(name: string, ok: unknown) { assert.ok(ok, name); passed++; console.log(`PASS ${name}`); }
const before = new Date("2026-10-01"), deleted = new Date("2026-10-20"), joined = new Date("2026-10-21");
const uid = "kakao_99999999998765", other = "kakao_99999999998766";
const job = { userId: uid, status: "COMPLETED", startedAt: deleted };
const old = { createdAt: before, dataEpoch: "old" }, fresh = { createdAt: joined, dataEpoch: "new" };
check("deleted account in old snapshot is removed", recoveredAccountAction(job, old, undefined) === "erase");
check("old snapshot is removed even after live rejoin", recoveredAccountAction(job, old, fresh) === "erase");
check("confirmed newer generation is preserved", recoveredAccountAction(job, fresh, fresh) === "keep");
check("orphaned owned records are removed", recoveredAccountAction(job, undefined, undefined) === "erase");
check("pending deletion stays removed", recoveredAccountAction({...job,status:"PENDING"},old,old) === "erase");
for (const [name, action] of [
  ["unknown job status", () => recoveredAccountAction({...job,status:"BAD"},old,old)],
  ["missing deletion date", () => recoveredAccountAction({...job,startedAt:null},old,old)],
  ["invalid owner", () => recoveredAccountAction({...job,userId:"../users"},old,old)],
  ["unknown snapshot age", () => recoveredAccountAction(job,{},fresh)],
  ["unverified rejoin", () => recoveredAccountAction(job,fresh,undefined)],
  ["different live generation", () => recoveredAccountAction(job,fresh,{...fresh,dataEpoch:"other"})],
  ["legacy ambiguous rejoin", () => recoveredAccountAction(job,{createdAt:joined},{createdAt:joined})],
  ["pending rejoin", () => recoveredAccountAction({...job,status:"PENDING"},fresh,fresh)],
  ["live deletion lock", () => recoveredAccountAction(job,fresh,{...fresh,deletionPending:true})],
] as const) { assert.throws(action); check(`${name} stops recovery`,true); }
check("Firestore timestamp supported", recoveryTime(Timestamp.fromDate(before)) === before.getTime());

async function main() {
  if (!process.argv.includes("--isolated-drill")) { console.log(`Recovery policy: ${passed} passed (no network).`); return; }
  loadEnvConfig(process.cwd(),true);
  const app = getFirebaseAdminApp();
  assert.equal(app.options.projectId,"dabom-10a35");
  const live = getFirestore(app), db = getFirestore(app,"dabom-restore-drill-20261028");
  try {
    await assert.rejects(() => sanitizeRecoveredDatabase(live,live,true)); check("production target is refused before I/O",true);
    await assert.rejects(() => eraseRecoveredAccount(live,"",uid)); check("direct erasure also refuses production",true);
    const snapshotTime = process.env.RECOVERY_DRILL_SNAPSHOT_TIME;
    if (snapshotTime) {
      const hash = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) => createHash("sha256").update(JSON.stringify(docs.map(d => [d.id,d.data()]))).digest("hex");
      for (const name of ["users", "profiles", "reports", "orders", "legalRecords"]) {
        const original = await live.runTransaction(tx => tx.get(live.collection(name)), {readOnly:true,readTime:Timestamp.fromDate(new Date(snapshotTime))});
        const recovered = await db.collection(name).get();
        check(`${name} matches the exact source snapshot without exporting personal data`, hash(original.docs) === hash(recovered.docs));
      }
    }
    for (const prefix of ["","payment_test_"]) {
      const refs = [db.doc(prefix+"users/"+uid),db.doc(prefix+"users/"+other)];
      assert.ok((await db.getAll(...refs)).every(d=>!d.exists),"synthetic identity collision");
      await refs[0].create(old); await refs[1].create(fresh);
      const batch=db.batch();
      for(const name of ["profiles","reports","orders","checkoutConsents"]) {
        batch.create(db.doc(prefix+name+"/recovery_deleted_fixture"),{userId:uid,content:"SYNTHETIC"});
        batch.create(db.doc(prefix+name+"/recovery_kept_fixture"),{userId:other,content:"SYNTHETIC"});
      }
      batch.create(db.doc(prefix+"legalRecords/recovery_held_fixture"),{accountId:uid,legalHold:true,purgeAt:null,amount:3900});
      await batch.commit();
      if(recoveredAccountAction(job,old,undefined)==="erase") await eraseRecoveredAccount(db,prefix,uid);
      check(`${prefix||"live"} old account removed`,!(await refs[0].get()).exists);
      check(`${prefix||"live"} newer unrelated account retained`,(await refs[1].get()).exists);
      for(const name of ["profiles","reports","orders","checkoutConsents"]) {
        check(`${prefix+name} removes deleted owner's content only`,!(await db.doc(prefix+name+"/recovery_deleted_fixture").get()).exists && (await db.doc(prefix+name+"/recovery_kept_fixture").get()).exists);
      }
      check(`${prefix||"live"} legal retention survives content erasure`,(await db.doc(prefix+"legalRecords/recovery_held_fixture").get()).get("legalHold")===true);
    }
    console.log(`Recovery drill: ${passed} passed. Synthetic records exist ONLY in the disposable recovery database.`);
  } finally { await live.terminate(); await db.terminate(); }
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Recovery check failed");process.exitCode=1;});
