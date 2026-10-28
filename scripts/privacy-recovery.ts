import { loadEnvConfig } from "@next/env";
import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseAdminApp } from "../src/lib/firebase/admin";
import { sanitizeRecoveredDatabase } from "../src/lib/privacy/recovery";

loadEnvConfig(process.cwd(), true);
const args = process.argv.slice(2);
const target = args[args.indexOf("--target") + 1];
const apply = args.includes("--apply");
if (!args.includes("--target") || !/^dabom-restore-[a-z0-9-]{4,40}$/.test(target) || (apply && (!args.includes("--isolated-confirmed") || !args.includes("--latest-ledger-confirmed")))) throw new Error("Use --target dabom-restore-NAME [--apply --isolated-confirmed --latest-ledger-confirmed]; production is never a target.");
const app = getFirebaseAdminApp(), source = getFirestore(app), restored = getFirestore(app, target);
if (app.options.projectId !== "dabom-10a35") throw new Error("WRONG_PROJECT");
sanitizeRecoveredDatabase(source, restored, apply).then(result => console.log(JSON.stringify(result))).catch(error => {
  const safeCodes = ["UNSAFE_RECOVERY_TARGET", "INVALID_DELETION_LEDGER", "RESTORED_ACCOUNT_DATE_MISSING", "REJOIN_REQUIRES_REVIEW", "LIVE_LEDGER_CHANGED_RERUN"];
  if (error instanceof Error && safeCodes.includes(error.message)) console.error(error.message);
  console.error("복원 정리가 완료되지 않았습니다. 운영에 연결하지 말고 최신 삭제 기록·대상 DB·권한을 확인하세요."); process.exitCode = 1;
}).finally(async () => { await source.terminate(); await restored.terminate(); });
