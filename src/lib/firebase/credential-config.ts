/** Explicit opt-in to Google-managed credentials; local development keeps its key file. */
export function firebaseCredentialConfig(env: Record<string, string | undefined> = process.env) {
  const projectId = env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is required.");
  if (env.FIREBASE_AUTH_EMULATOR_HOST || env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("Firebase emulators are not allowed for this server connection.");
  }
  const mode = env.FIREBASE_ADMIN_CREDENTIAL_MODE?.trim();
  const json = Boolean(env.FIREBASE_ADMIN_CREDENTIALS_JSON?.trim());
  const file = Boolean(env.FIREBASE_ADMIN_CREDENTIALS_FILE?.trim());
  if (mode === "application-default") {
    if (json || file || env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
      throw new Error("Managed Firebase credentials cannot be combined with a credential file or JSON.");
    }
    const serviceAccountId = env.FIREBASE_ADMIN_SERVICE_ACCOUNT_ID?.trim();
    if (
      env.DABOM_HOSTING !== "firebase-app-hosting" ||
      env.GOOGLE_CLOUD_PROJECT !== projectId ||
      serviceAccountId !== `firebase-app-hosting-compute@${projectId}.iam.gserviceaccount.com`
    ) {
      throw new Error("Firebase managed credential project or service account does not match.");
    }
    return { projectId, mode, serviceAccountId } as const;
  }
  if ((mode && mode !== "service-account") || json === file) {
    throw new Error("Configure exactly one Firebase Admin credential source.");
  }
  return { projectId, mode: "service-account" } as const;
}
