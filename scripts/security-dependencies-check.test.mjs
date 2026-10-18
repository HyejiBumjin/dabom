import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { Linter } from "eslint";
import nextPlugin from "@next/eslint-plugin-next";

// Exercise the real Next ESLint consumer, including its directory-glob path.
// The app's default config alone never calls globSync, so lint alone misses an
// incompatible replacement (e.g. tinyglobby's directory expansion default).
const require = createRequire(import.meta.url);
const pluginRequire = createRequire(require.resolve("@next/eslint-plugin-next"));
const { getRootDirs } = pluginRequire("./utils/get-root-dirs.js");
const fixture = mkdtempSync(path.join(tmpdir(), "dabom-lint-roots-"));
const web = path.join(fixture, "packages/web");
const admin = path.join(fixture, "packages/admin");
for (const root of [web, admin]) {
  mkdirSync(path.join(root, "app/about"), { recursive: true });
  mkdirSync(path.join(root, "pages"), { recursive: true });
  writeFileSync(path.join(root, "app/about/page.tsx"), "export default function Page() { return null; }\n");
  writeFileSync(path.join(root, "pages/about.tsx"), "export default function Page() { return null; }\n");
}
writeFileSync(path.join(fixture, "packages/not-a-directory.txt"), "fixture");
after(() => rmSync(fixture, { recursive: true, force: true }));

const roots = (rootDir) => getRootDirs({ cwd: fixture, settings: { next: { rootDir } } }).sort();

test("Next uses the reviewed release containing the October 2026 security fixes", () => {
  // npm audit did not report the advisories for 16.4.0 during this review.
  // https://nextjs.org/blog/nextjs-security-update-october-14-2026
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
  const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url)));
  const reviewedVersion = "16.4.2";
  assert.equal(manifest.dependencies.next, reviewedVersion);
  assert.equal(lock.packages["node_modules/next"].version, reviewedVersion);
  assert.equal(require("next/package.json").version, reviewedVersion);
});

test("Next resolves the scoped adapter and the lockfile excludes the vulnerable chain", () => {
  assert.equal(pluginRequire.resolve("fast-glob"), require.resolve("../tools/eslint-root-glob/index.cjs"));
  const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url)));
  assert.equal(lock.packages["node_modules/@next/eslint-plugin-next"].version, "16.4.2", "Review the adapter's API coverage before upgrading Next ESLint");
  for (const entry of Object.keys(lock.packages)) {
    assert.ok(!/(?:^|\/)node_modules\/(?:braces|micromatch)$/.test(entry), `Vulnerable dependency returned: ${entry}`);
  }
});

test("default root is the project directory", () => assert.deepEqual(roots(undefined), [fixture]));
test("literal directory is not expanded to descendants", () => assert.deepEqual(roots(web), [web]));
test("wildcard roots contain only directories without trailing slashes", () => {
  assert.deepEqual(roots(path.join(fixture, "packages/*")), [admin, web]);
});
test("brace alternatives preserve root boundaries", () => {
  assert.deepEqual(roots(path.join(fixture, "packages/{web,admin}")), [admin, web]);
});
test("root arrays and missing paths keep their semantics", () => {
  assert.deepEqual(roots([web, path.join(fixture, "missing*"), admin]), [admin, web]);
});
test("trailing slash and Windows-style separators are normalized by Next", () => {
  assert.deepEqual(roots(`${web}/`), [web]);
  assert.deepEqual(roots(web.replaceAll("/", "\\")), [web]);
});
test("Next's internal-link rule still detects pages in globbed roots", () => {
  const linter = new Linter();
  const config = {
    plugins: { "@next/next": nextPlugin },
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    settings: { next: { rootDir: path.join(fixture, "packages/{web,admin}") } },
    rules: { "@next/next/no-html-link-for-pages": "error" },
  };
  const bad = linter.verify('const el = <a href="/about">About</a>;', config);
  assert.equal(bad.length, 1);
  assert.equal(bad[0].ruleId, "@next/next/no-html-link-for-pages");
  assert.deepEqual(linter.verify('const el = <a href="https://example.com/about">About</a>;', config), []);
});
