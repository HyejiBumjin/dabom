import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import { getSecurityRules } from "firebase-admin/security-rules";
import { getFirebaseAdminApp, getFirebaseAdminAuth, getFirebaseAdminFirestore } from "../src/lib/firebase/admin";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
const canonical = (value: string) => value.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "").replace(/\s+/g, "");
async function main() {
  if (process.env.VERCEL_ENV !== "production" && !process.argv.includes("--check")) return;
  assert.equal(process.env.FIREBASE_PROJECT_ID, "dabom-10a35");
  assert.ok(["FIREBASE_WEB_API_KEY", "KAKAO_REST_API_KEY", "KAKAO_CLIENT_SECRET"].every(key => Boolean(process.env[key])), "Firebase/Kakao configuration missing");
  if (process.env.VERCEL_ENV === "production") assert.equal(new URL(process.env.NEXT_PUBLIC_APP_URL!).origin, "https://dabom-letter.com");
  const app = getFirebaseAdminApp();
  const db = getFirebaseAdminFirestore();
  try {
    await getFirebaseAdminAuth().listUsers(1);
    const rules = await getSecurityRules(app).getFirestoreRuleset();
    const expected = canonical(readFileSync("firestore.rules", "utf8"));
    assert.equal(rules.source.length, 1);
    assert.equal(canonical(rules.source[0].content), expected, "Deployed rules differ from reviewed deny-all rules");
    assert.ok(expected.includes("allowread,write:iffalse;"));
    const product = await db.collection("products").doc("yearly_2026").get();
    assert.ok(product.exists && product.get("active") && Number.isSafeInteger(product.get("price")) && product.get("price") > 0);
    console.log("PASS Firebase project/credential match, Authentication access, deployed deny-all rules, product configuration");
  } finally { await db.terminate(); }
}
main().catch(() => { console.error("Firebase production security preflight failed; credentials and customer data withheld."); process.exitCode=1; });
