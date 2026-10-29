import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import {
  adminSignIn,
  adminSignOutUser,
  getFirebaseAuth,
  sendAdminPasswordResetEmail,
} from "../lib/firebase";

const RESET_COOLDOWN_MS = 60_000;

export interface SignInResult {
  ok: boolean;
  error?: string;
}

export interface ResetResult {
  ok: boolean;
  sent: boolean;
}

interface AdminAuthContextValue {
  user: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<ResetResult>;
  isResetCoolingDown: boolean;
  resetCooldownSecondsLeft: number;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetCooldownUntil, setResetCooldownUntil] = useState<number>(0);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    try {
      const u = await adminSignIn(email, password);
      setUser(u);
      return { ok: true };
    } catch {
      // Generic message — never reveal whether the email exists.
      return { ok: false, error: "Invalid email or password." };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await adminSignOutUser();
    } finally {
      setUser(null);
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string): Promise<ResetResult> => {
    const normalized = email.trim().toLowerCase();
    try {
      await sendAdminPasswordResetEmail(normalized);
    } catch {
      // Always resolve successfully so the UI shows the same neutral message.
    }
    setResetCooldownUntil(Date.now() + RESET_COOLDOWN_MS);
    return { ok: true, sent: true };
  }, []);

  const now = Date.now();
  const isResetCoolingDown = now < resetCooldownUntil;
  const resetCooldownSecondsLeft = Math.max(0, Math.ceil((resetCooldownUntil - now) / 1000));

  // Tick once per second while cooling down so the countdown actually counts.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isResetCoolingDown) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isResetCoolingDown]);

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signOut,
      sendPasswordReset,
      isResetCoolingDown,
      resetCooldownSecondsLeft,
    }),
    [user, loading, signIn, signOut, sendPasswordReset, isResetCoolingDown, resetCooldownSecondsLeft]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  return ctx;
}
