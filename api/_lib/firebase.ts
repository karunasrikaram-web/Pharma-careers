import { createRequire } from "module";
const require = createRequire(import.meta.url);
const admin = require("firebase-admin") as typeof import("firebase-admin");

type FirebaseAdminApp = ReturnType<typeof admin.initializeApp>;

let cachedApp: FirebaseAdminApp | null = null;

export function getFirebaseAdmin(): FirebaseAdminApp {
  if (cachedApp) return cachedApp;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson) as Parameters<typeof admin.credential.cert>[0];
    cachedApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID ?? "";
    cachedApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
        privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n").trim(),
      }),
      projectId,
    });
  }

  return cachedApp;
}

export type AdminAuthResult =
  | { ok: true; uid: string; email: string; admin: true }
  | { ok: false; status: 401 | 403 | 429; reason: "missing" | "invalid" | "forbidden" | "rate_limited" };

export async function verifyAdminToken(token: string): Promise<AdminAuthResult> {
  if (!token) return { ok: false, status: 401, reason: "missing" };

  try {
    const firebaseAuth = getFirebaseAdmin().auth();
    const decodedToken = await firebaseAuth.verifyIdToken(token, true);
    const adminClaim =
      (decodedToken as unknown as { admin?: boolean }).admin === true ||
      (decodedToken as unknown as { claims?: { admin?: boolean } }).claims?.admin === true;

    if (!adminClaim) {
      return { ok: false, status: 403, reason: "forbidden" };
    }

    const userRecord = await firebaseAuth.getUser(decodedToken.uid);
    return { ok: true, uid: userRecord.uid, email: userRecord.email ?? "", admin: true };
  } catch {
    return { ok: false, status: 401, reason: "invalid" };
  }
}

export async function createAdminSessionCookie(idToken: string, maxAgeSeconds = 3600): Promise<string> {
  const token = await getFirebaseAdmin().auth().createSessionCookie(idToken, { expiresIn: maxAgeSeconds });
  return token;
}

export async function verifyAdminSessionCookie(token: string): Promise<AdminAuthResult> {
  if (!token) return { ok: false, status: 401, reason: "missing" };

  try {
    const firebaseAuth = getFirebaseAdmin().auth();
    const decoded = await firebaseAuth.verifySessionCookie(token, true);
    const userRecord = await firebaseAuth.getUser(decoded.uid);
    const adminClaim = userRecord.customClaims?.admin === true;
    if (!adminClaim) {
      return { ok: false, status: 403, reason: "forbidden" };
    }
    return { ok: true, uid: userRecord.uid, email: userRecord.email ?? "", admin: true };
  } catch {
    return { ok: false, status: 401, reason: "invalid" };
  }
}
