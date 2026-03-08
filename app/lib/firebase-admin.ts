import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let firebaseAdminApp: App | null = null;

function getPrivateKey(): string {
  const raw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!raw) {
    throw new Error("FIREBASE_ADMIN_PRIVATE_KEY is not set.");
  }
  return raw.replace(/\\n/g, "\n");
}

export function getFirebaseAdminApp(): App {
  if (firebaseAdminApp) return firebaseAdminApp;

  const existing = getApps()[0];
  if (existing) {
    firebaseAdminApp = existing;
    return existing;
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "via-platform-5482b";
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!clientEmail) {
    throw new Error("FIREBASE_ADMIN_CLIENT_EMAIL is not set.");
  }

  firebaseAdminApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

  return firebaseAdminApp;
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}
