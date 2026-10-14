import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const files = execFileSync("git", ["ls-files", "-z", "-co", "--exclude-standard"], { encoding: "utf8" }).split("\0").filter(Boolean);
const patterns = [
  ["api-key", /sk-(?:proj-)?[A-Za-z0-9_-]{35,}/],
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["supabase-secret", /sb_secret_[A-Za-z0-9_-]{20,}/],
];
const findings = [];
function legacySecretKinds(source) {
  const kinds = [];
  for (const token of source.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []) {
    try { if (JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).role === "service_role") kinds.push("legacy-service-role-jwt"); } catch { /* Not a token. */ }
  }
  for (const uri of source.match(/postgres(?:ql)?:\/\/[^\s"'`]+/g) ?? []) {
    try {
      const parsed = new URL(uri);
      if (/\.(?:invalid|example|test)$/.test(parsed.hostname)) continue;
      if (/^(?:supabase[-_]db[-_]host|supabase[-_]pooler[-_]host|pooler[-_]host|db[-_]host|host|hostname)$/i.test(parsed.hostname)) continue;
      // Historical .env.example uses an explicit USER + placeholder host pair.
      if (parsed.username === "USER" && /host|project|region|example|placeholder/i.test(parsed.hostname)) continue;
      const password = decodeURIComponent(parsed.password);
      if (password && !/^(?:PASSWORD|YOUR_[A-Z_-]*PASSWORD|password|\[YOUR-PASSWORD\]|<[^>]+>)$/i.test(password)) kinds.push("database-credential");
    } catch { /* Not a valid connection URI. */ }
  }
  return [...new Set(kinds)];
}
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
historyFindings.push(...legacySecretKinds(history));
const secretNames = ["OPENAI_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "PORTONE_API_SECRET", "PORTONE_WEBHOOK_SECRET", "DATABASE_URL", "ABLECITY_API_KEY"];
const secrets = secretNames.filter(name => (process.env[name]?.length ?? 0) >= 16).map(name => ({ name, value: process.env[name] }));
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
