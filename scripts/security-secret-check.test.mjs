import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { legacySecretKinds } from "./security/legacy-secrets.mjs";

const historicalExample = execFileSync("git", ["show", "c4a68b30f33e:.env.example"], { encoding: "utf8" }).match(/postgres(?:ql)?:\/\/[^\s"'`]+/)[0];
const history = { historical: true };
const hasCredential = (source, options) => legacySecretKinds(source, options).includes("database-credential");

test("only the reviewed historical Docker URL is excluded", () => {
  assert.equal(hasCredential(historicalExample, history), false);
  assert.equal(hasCredential(historicalExample), true, "A historical exception must not hide a credential in current source");
});
for (const field of ["hostname", "username", "password", "port", "pathname"]) {
  test(`changed ${field} remains a finding even in history`, () => {
    const changed = new URL(historicalExample);
    changed[field] = { hostname: "db.customer-domain.com", username: "different-user", password: "synthetic-changed-secret", port: "5433", pathname: "/different-db" }[field];
    assert.equal(hasCredential(changed.href, history), true);
  });
}
test("URL-encoded local passwords are still checked", () => {
  const changed = new URL(historicalExample);
  changed.password = "synthetic%40changed";
  assert.equal(hasCredential(changed.href, history), true);
});
test("service role JWTs remain findings", () => {
  const token = [Buffer.from('{"alg":"HS256"}').toString("base64url"), Buffer.from('{"role":"service_role"}').toString("base64url"), "synthetic"].join(".");
  assert.deepEqual(legacySecretKinds(token, history), ["legacy-service-role-jwt"]);
});
