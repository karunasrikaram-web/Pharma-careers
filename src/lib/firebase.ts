import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { firebaseConfig, isFirebaseConfigured } from "./env";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!auth) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
  return auth;
}

/** Signs an admin in with Firebase email + password. Never throws — callers map errors. */
export async function adminSignIn(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/** Sends a Firebase password-reset email. Resolves even when the account is unknown. */
export async function sendAdminPasswordResetEmail(email: string, redirectUrl?: string): Promise<void> {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email, { url: redirectUrl ?? window.location.origin });
}

export async function adminSignOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

export function isFirebaseAuthConfigured(): boolean {
  return isFirebaseConfigured;
}
