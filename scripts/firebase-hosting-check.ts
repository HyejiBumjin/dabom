import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { firebaseCredentialConfig } from "../src/lib/firebase/credential-config";

// No project credentials, identity providers, or network calls are used.
globalThis.fetch = async () => { throw new Error("Unexpected network request"); };
const require = createRequire(import.meta.url);
let passed = 0;
function check(name: string, fn: () => void) { fn(); passed++; console.log(`PASS ${name}`); }
const native: Record<string, string | undefined> = {
  FIREBASE_PROJECT_ID: "dabom-10a35",
  DABOM_HOSTING: "firebase-app-hosting",
  GOOGLE_CLOUD_PROJECT: "dabom-10a35",
  FIREBASE_ADMIN_CREDENTIAL_MODE: "application-default",
  FIREBASE_ADMIN_SERVICE_ACCOUNT_ID: "firebase-app-hosting-compute@dabom-10a35.iam.gserviceaccount.com",
};
check("App Hosting explicitly selects keyless credentials for the intended project", () => {
  assert.deepEqual(firebaseCredentialConfig(native), {
    projectId: "dabom-10a35", mode: "application-default", serviceAccountId: native.FIREBASE_ADMIN_SERVICE_ACCOUNT_ID,
  });
});
check("local credential files continue to work", () => assert.equal(firebaseCredentialConfig({ FIREBASE_PROJECT_ID: "dabom-10a35", FIREBASE_ADMIN_CREDENTIALS_FILE: "synthetic-file" }).mode, "service-account"));
check("Vercel JSON credentials continue to work", () => assert.equal(firebaseCredentialConfig({ FIREBASE_PROJECT_ID: "dabom-10a35", FIREBASE_ADMIN_CREDENTIALS_JSON: "synthetic-json" }).mode, "service-account"));
for (const [name, override] of Object.entries({
  "missing project": { FIREBASE_PROJECT_ID: "" },
  "unknown mode": { FIREBASE_ADMIN_CREDENTIAL_MODE: "automatic" },
  "unconfigured host": { DABOM_HOSTING: "" },
  "wrong project": { GOOGLE_CLOUD_PROJECT: "another-project" },
  "wrong signer": { FIREBASE_ADMIN_SERVICE_ACCOUNT_ID: "admin@another-project.iam.gserviceaccount.com" },
  "mixed JSON": { FIREBASE_ADMIN_CREDENTIALS_JSON: "synthetic-json" },
  "mixed file": { FIREBASE_ADMIN_CREDENTIALS_FILE: "synthetic-file" },
  "implicit ADC file": { GOOGLE_APPLICATION_CREDENTIALS: "synthetic-file" },
  "auth emulator": { FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099" },
  "database emulator": { FIRESTORE_EMULATOR_HOST: "localhost:8080" },
})) check(`rejects ${name} before SDK access`, () => assert.throws(() => firebaseCredentialConfig({ ...native, ...override })));
check("missing credentials never silently enable ADC", () => assert.throws(() => firebaseCredentialConfig({ FIREBASE_PROJECT_ID: "dabom-10a35" })));
check("ambiguous local credential sources fail closed", () => assert.throws(() => firebaseCredentialConfig({ FIREBASE_PROJECT_ID: "dabom-10a35", FIREBASE_ADMIN_CREDENTIALS_JSON: "json", FIREBASE_ADMIN_CREDENTIALS_FILE: "file" })));

const env = process.env as Record<string, string | undefined>;
for (const key of Object.keys(env)) if (/^(FIREBASE_|GOOGLE_APPLICATION_CREDENTIALS$|GOOGLE_CLOUD_PROJECT$|DABOM_HOSTING$)/.test(key)) delete env[key];
Object.assign(env, native);
const sdkPath = require.resolve("firebase-admin/app");
const sdk = require(sdkPath);
const fakeCredential = { getAccessToken: async () => { throw new Error("Unexpected token request"); } };
let initialization: Record<string, unknown> | undefined;
const apps: unknown[] = [];
require.cache[sdkPath]!.exports = {
  ...sdk, applicationDefault: () => fakeCredential,
  cert: () => { throw new Error("Managed deployment tried to load a private key"); },
  getApps: () => apps,
  initializeApp: (options: Record<string, unknown>, name: string) => {
    initialization = options;
    const app = { options, name }; apps.push(app); return app;
  },
};
const { getFirebaseAdminApp } = require("../src/lib/firebase/admin") as typeof import("../src/lib/firebase/admin");
check("Admin SDK receives managed credentials and the project-bound token signer", () => {
  getFirebaseAdminApp();
  assert.equal(initialization?.credential, fakeCredential);
  assert.equal(initialization?.projectId, native.FIREBASE_PROJECT_ID);
  assert.equal(initialization?.serviceAccountId, native.FIREBASE_ADMIN_SERVICE_ACCOUNT_ID);
});
check("cached SDK instance cannot bypass invalid configuration", () => {
  env.GOOGLE_CLOUD_PROJECT = "another-project";
  assert.throws(() => getFirebaseAdminApp());
  env.GOOGLE_CLOUD_PROJECT = native.GOOGLE_CLOUD_PROJECT;
});
const { firebaseAuthConfigured } = require("../src/lib/firebase/auth") as typeof import("../src/lib/firebase/auth");
Object.assign(env, { FIREBASE_WEB_API_KEY: "synthetic-web", KAKAO_REST_API_KEY: "synthetic-rest", KAKAO_CLIENT_SECRET: "synthetic-secret" });
check("Kakao login recognizes managed credentials without a key file", () => assert.equal(firebaseAuthConfigured(), true));
check("misconfigured credentials disable login without exposing values", () => {
  env.FIREBASE_ADMIN_CREDENTIALS_JSON = "synthetic-conflict";
  assert.equal(firebaseAuthConfigured(), false);
  delete env.FIREBASE_ADMIN_CREDENTIALS_JSON;
});
check("missing Kakao secret keeps login disabled", () => {
  delete env.KAKAO_CLIENT_SECRET;
  assert.equal(firebaseAuthConfigured(), false);
});
console.log(`\n${passed} PASS; no cloud resources or customer data modified.`);
