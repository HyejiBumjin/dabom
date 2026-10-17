import "server-only";

import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";

const serviceAccountSchema = z.object({
  type: z.literal("service_account"),
  project_id: z.string().min(1),
  client_email: z.email(),
  private_key: z.string().min(1),
});

function readServiceAccount(projectId: string) {
  const json = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON?.trim();
  const file = process.env.FIREBASE_ADMIN_CREDENTIALS_FILE?.trim();
  if ((!json && !file) || (json && file)) {
    throw new Error("Configure exactly one Firebase Admin credential source.");
  }

  let parsed: unknown;
  try {
    let content = json;
    if (file) {
      const path = resolve(file);
      const metadata = statSync(path);
      if (!metadata.isFile() || (process.platform !== "win32" && (metadata.mode & 0o077) !== 0)) {
        throw new Error("Unsafe credential file permissions.");
      }
      content = readFileSync(path, "utf8");
    }
    parsed = JSON.parse(content!);
  } catch {
    // Never include credential contents or SDK error payloads in logs/responses.
    throw new Error("Cannot read Firebase Admin credentials. Check JSON and file permissions (0600).");
  }

  const result = serviceAccountSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("Invalid Firebase Admin service account configuration.");
  }
  const account = result.data;
  if (
    account.project_id !== projectId ||
    !account.client_email.endsWith(`@${projectId}.iam.gserviceaccount.com`)
  ) {
    throw new Error("Firebase credential project does not match FIREBASE_PROJECT_ID.");
  }
  return account;
}

/** Server-only access. Callers must still enforce account ownership and payment access. */
export function getFirebaseAdminApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is required.");
  // This connector must never silently replace real authentication with an emulator.
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("Firebase emulators are not allowed for this server connection.");
  }

  const name = `dabom-admin:${projectId}`;
  const existing = getApps().find((app) => app.name === name);
  if (existing) return existing;

  const account = readServiceAccount(projectId);
  try {
    return initializeApp({
      projectId,
      credential: cert({
        projectId: account.project_id,
        clientEmail: account.client_email,
        privateKey: account.private_key,
      }),
    }, name);
  } catch {
    throw new Error("Unable to initialize Firebase Admin. Check the service account configuration.");
  }
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseAdminFirestore() {
  return getFirestore(getFirebaseAdminApp());
}
