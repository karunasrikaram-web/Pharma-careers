import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";

const NEUTRAL_RESET_MESSAGE = "If an account exists for this email, a reset link has been sent.";

const styles: Record<string, React.CSSProperties> = {
  center: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    flexDirection: "column",
    background: "#0b1020",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#121a2e",
    border: "1px solid #22304d",
    borderRadius: 16,
    padding: 24,
  },
  title: { fontSize: 22, fontWeight: 700, margin: 0 },
  subtitle: { color: "#9aa7bd", fontSize: 13, marginTop: 4 },
  form: { display: "flex", flexDirection: "column", gap: 14, marginTop: 18 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, color: "#c6d0e0" },
  input: {
    background: "#0b1020",
    border: "1px solid #22304d",
    borderRadius: 10,
    padding: "10px 12px",
    color: "#e6eaf2",
    outline: "none",
  },
  button: {
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "11px 14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  buttonOutline: { background: "transparent", border: "1px solid #22304d", color: "#c6d0e0", cursor: "pointer", padding: "10px 14px", borderRadius: 10 },
  link: { background: "none", border: "none", color: "#7aa2ff", cursor: "pointer", padding: 0, font: "inherit" },
  muted: { color: "#9aa7bd", fontSize: 13, marginTop: 14 },
  error: { color: "#ff7b72", fontSize: 13 },
  neutral: { color: "#e6eaf2", fontSize: 14 },
};

export default function AdminLogin() {
  const { user, loading, signIn, signOut, sendPasswordReset, isResetCoolingDown, resetCooldownSecondsLeft } =
    useAdminAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [loading, user, navigate]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Email is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    setSubmitting(true);
    const result = await signIn(trimmed, password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? "Invalid email or password.");
      return;
    }
    navigate("/admin/dashboard", { replace: true });
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || isResetCoolingDown) return;
    setError(null);

    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    const result = await sendPasswordReset(trimmed);
    setSubmitting(false);
    setResetSent(true);
    void result;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login", { replace: true });
  };

  if (loading) {
    return <div style={{ ...styles.center, alignItems: "center" }}>Loading…</div>;
  }

  if (user) {
    return null;
  }

  return (
    <div style={styles.center}>
      <div style={styles.card}>
        <h1 style={styles.title}>{mode === "login" ? "Admin sign in" : "Reset your password"}</h1>
        <div style={styles.subtitle}>Firebase · email + password</div>

        {mode === "login" ? (
          <form onSubmit={handleLoginSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={submitting}
                autoComplete="email"
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={submitting}
                autoComplete="current-password"
                style={styles.input}
              />
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button type="submit" disabled={submitting} style={styles.button}>
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : resetSent ? (
          <div style={{ marginTop: 18 }}>
            <p style={styles.neutral}>{NEUTRAL_RESET_MESSAGE}</p>
            <p style={styles.muted}>If the address above is associated with an admin account, check your inbox for the reset link.</p>
            <button
              type="button"
              onClick={() => { setMode("login"); setResetSent(false); setError(null); }}
              style={{ ...styles.buttonOutline, marginTop: 14, cursor: "pointer" }}
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={submitting || isResetCoolingDown}
                autoComplete="email"
                style={styles.input}
              />
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button type="submit" disabled={submitting || isResetCoolingDown} style={styles.button}>
              {isResetCoolingDown ? `Try again in ${resetCooldownSecondsLeft}s` : "Send reset link"}
            </button>
            <button
              type="button"
              onClick={() => { setMode("login"); setError(null); setResetSent(false); }}
              style={{ ...styles.buttonOutline, cursor: "pointer" }}
            >
              Back to sign in
            </button>
          </form>
        )}

        {mode === "login" && (
          <div style={{ marginTop: 14, textAlign: "center" }}>
            <button type="button" onClick={() => { setMode("forgot"); setError(null); setResetSent(false); }} style={styles.link}>
              Forgot password?
            </button>
          </div>
        )}

        <div style={{ marginTop: 18, borderTop: "1px solid #22304d", paddingTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Password reset &amp; Firebase setup</div>
          <div style={{ ...styles.muted, marginTop: 6, textAlign: "left" }}>
            <p>
              <strong>Reset email</strong> uses Firebase <code>sendPasswordResetEmail</code>. The reset link uses
              the action URL configured in the Firebase Console → Authentication → Templates → Password reset
              email. Set the authorized domain and action URL (for example <code>https://your-domain/admin/login</code>)
              accordingly.
            </p>
            <p>
              <strong>Rate limit</strong>: a 60s cooldown is applied to the reset button to prevent spamming;
              Firebase also rate limits server-side.
            </p>
          </div>
        </div>

        {mode === "login" && (
          <p style={styles.muted}>
            <button type="button" onClick={handleSignOut} style={styles.link}>
              Sign out
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
