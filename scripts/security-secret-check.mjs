import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import nextEnv from "@next/env";
import { legacySecretKinds } from "./security/legacy-secrets.mjs";

nextEnv.loadEnvConfig(process.cwd());
const files = execFileSync("git", ["ls-files", "-z", "-co", "--exclude-standard"], { encoding: "utf8" }).split("\0").filter(Boolean);
const patterns = [
  ["api-key", /sk-(?:proj-)?[A-Za-z0-9_-]{35,}/],
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["supabase-secret", /sb_secret_[A-Za-z0-9_-]{20,}/],
];
const findings = [];

for (const file of files) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
  const data = fs.readFileSync(file);
  if (data.includes(0)) continue;
  const source = data.toString();
  for (const [kind, pattern] of patterns) if (pattern.test(source)) findings.push({ file, kind });
  for (const kind of legacySecretKinds(source)) findings.push({ file, kind });
}
// Scan tracked history for key material without printing matching lines/values.
const history = execFileSync("git", ["log", "--all", "-p", "--format=commit %H"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const historyFindings = patterns.filter(([, pattern]) => pattern.test(history)).map(([kind]) => kind);
historyFindings.push(...legacySecretKinds(history, { historical: true }));
const secretNames = ["OPENAI_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "PORTONE_API_SECRET", "PORTONE_WEBHOOK_SECRET", "DATABASE_URL", "ABLECITY_API_KEY", "FIREBASE_ADMIN_CREDENTIALS_JSON", "KAKAO_CLIENT_SECRET"];
const secrets = secretNames.filter(name => (process.env[name]?.length ?? 0) >= 16).map(name => ({ name, value: process.env[name] }));
// Credential files are intentionally ignored by Git, but their contents must also
// stay out of browser bundles and tracked history. Never print matching values.
const firebaseCredentialSources = [];
if (process.env.FIREBASE_ADMIN_CREDENTIALS_JSON) firebaseCredentialSources.push(process.env.FIREBASE_ADMIN_CREDENTIALS_JSON);
if (process.env.FIREBASE_ADMIN_CREDENTIALS_FILE) {
  try {
    firebaseCredentialSources.push(fs.readFileSync(path.resolve(process.env.FIREBASE_ADMIN_CREDENTIALS_FILE), "utf8"));
  } catch {
    console.error("Unable to inspect configured Firebase credential file for secret leakage.");
    process.exit(1);
  }
}
for (const source of firebaseCredentialSources) {
  try {
    const key = JSON.parse(source).private_key;
    if (typeof key !== "string" || key.length < 64) throw new Error("Invalid credential.");
    secrets.push({ name: "FIREBASE_ADMIN_PRIVATE_KEY", value: key });
    secrets.push({ name: "FIREBASE_ADMIN_PRIVATE_KEY_ESCAPED", value: JSON.stringify(key).slice(1, -1) });
  } catch {
    console.error("Unable to parse configured Firebase credentials for secret leakage.");
    process.exit(1);
  }
}
const bundleFindings = [];
for (const secret of secrets) if (history.includes(secret.value)) historyFindings.push(`current-${secret.name}`);
function scan(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(file);
    else {
      const source = fs.readFileSync(file).toString();
      for (const secret of secrets) if (source.includes(secret.value)) bundleFindings.push({ file, secretName: secret.name });
    }
  }
}
scan(".next/static");
console.log(JSON.stringify({ scannedFiles: files.length, currentSourceFindings: findings, historyFindings, clientBundleFindings: bundleFindings, clientBundlePresent: fs.existsSync(".next/static") }, null, 2));
if (findings.length || historyFindings.length || bundleFindings.length) process.exitCode = 1;
