import { createHash } from "node:crypto";

// Reviewed fixture: c4a68b30f33e:.env.example exactly matches the literal local
// PostgreSQL defaults in that commit's docker-compose.yml. It was removed by
// 62d0bee3ab68. Only this full URL is exempt, only while scanning history.
// Other localhost passwords, changed URLs, and current source remain checked.
const LOCAL_DOCKER_HISTORY = new Set([
  "3a6cab236e62f935fdfa816c1ec81f8a0eac87c5ca3feb0c764abb7abfd1b61c",
]);

export function legacySecretKinds(source, { historical = false } = {}) {
  const kinds = [];
  for (const token of source.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []) {
    try { if (JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).role === "service_role") kinds.push("legacy-service-role-jwt"); } catch { /* Not a token. */ }
  }
  for (const uri of source.match(/postgres(?:ql)?:\/\/[^\s"'`]+/g) ?? []) {
    try {
      if (historical && LOCAL_DOCKER_HISTORY.has(createHash("sha256").update(uri).digest("hex"))) continue;
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
