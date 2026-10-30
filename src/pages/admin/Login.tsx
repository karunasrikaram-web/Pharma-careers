import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import loginBg from "../../assets/login-bg.svg";

const NEUTRAL_RESET_MESSAGE = "If an account exists for this email, a reset link has been sent.";

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    display: "flex",
    background: "#04120c",
    color: "#e6eaf2",
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  /* ── left: image panel ─────────────────────────────────────────── */
  visual: {
    position: "relative",
    flex: "1 1 58%",
    backgroundImage: `url(${loginBg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "48px 56px",
    overflow: "hidden",
  },
  visualShade: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(120deg, rgba(4,18,12,0.72) 0%, rgba(4,18,12,0.25) 45%, rgba(4,18,12,0.55) 100%)",
  },
  brand: { position: "relative", display: "flex", alignItems: "center", gap: 12 },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: "linear-gradient(135deg, #bef264, #a3e635)",
    display: "grid",
    placeItems: "center",
    fontSize: 22,
    boxShadow: "0 8px 24px rgba(190,242,100,0.35)",
  },
  brandName: { fontSize: 20, fontWeight: 800, letterSpacing: "-0.01em", color: "#ffffff" },
  brandTag: {
    marginLeft: 10,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#bef264",
    border: "1px solid rgba(190,242,100,0.45)",
    borderRadius: 999,
    padding: "4px 10px",
  },
  pitch: { position: "relative", maxWidth: 560 },
  pitchKicker: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#bef264",
    marginBottom: 14,
  },
  pitchTitle: {
    fontSize: "clamp(30px, 3.4vw, 46px)",
    fontWeight: 800,
    lineHeight: 1.12,
    letterSpacing: "-0.02em",
    color: "#ffffff",
    margin: "0 0 16px",
  },
  pitchText: { fontSize: 16, lineHeight: 1.6, color: "#cfe3d6", margin: 0, maxWidth: 480 },
  features: { position: "relative", listStyle: "none", margin: "28px 0 0", padding: 0, display: "grid", gap: 12 },
  feature: { display: "flex", alignItems: "center", gap: 10, fontSize: 14.5, color: "#dcebe2" },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#bef264",
    flex: "none",
    boxShadow: "0 0 10px rgba(190,242,100,0.8)",
  },
  visualFoot: { position: "relative", fontSize: 13, color: "rgba(207,227,214,0.75)" },

  /* ── right: sign-in panel ──────────────────────────────────────── */
  panel: {
    flex: "0 0 460px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 36px",
    background: "rgba(7, 20, 15, 0.92)",
    borderLeft: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "-30px 0 60px rgba(0,0,0,0.45)",
    backdropFilter: "blur(8px)",
  },
  card: { width: "100%", maxWidth: 368 },
  title: { fontSize: 27, fontWeight: 800, margin: 0, letterSpacing: "-0.02em", color: "#ffffff" },
  subtitle: { color: "#93af9d", fontSize: 13.5, marginTop: 6 },
  form: { display: "flex", flexDirection: "column", gap: 15, marginTop: 26 },
  field: { display: "flex", flexDirection: "column", gap: 7 },
  label: { fontSize: 13, fontWeight: 600, color: "#c6d0e0" },
  input: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 10,
    padding: "12px 14px",
    color: "#e6eaf2",
    fontSize: 15,
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  button: {
    background: "linear-gradient(135deg, #bef264, #a3e635)",
    color: "#0b3d26",
    border: "none",
    borderRadius: 10,
    padding: "13px 14px",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(163,230,53,0.25)",
    transition: "transform 0.12s, box-shadow 0.15s, filter 0.15s",
  },
  buttonOutline: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "#c6d0e0",
    cursor: "pointer",
    padding: "11px 14px",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
  },
  link: {
    background: "none",
    border: "none",
    color: "#bef264",
    cursor: "pointer",
    padding: 0,
    font: "inherit",
    fontSize: 14,
    fontWeight: 600,
  },
  muted: { color: "#93af9d", fontSize: 13, marginTop: 14, lineHeight: 1.55 },
  error: { color: "#ff8b82", fontSize: 13.5, margin: 0 },
  neutral: { color: "#e6eaf2", fontSize: 14.5, lineHeight: 1.55, margin: 0 },
  divider: { borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 24, paddingTop: 16 },
  helpTitle: { fontSize: 13, fontWeight: 700, color: "#e6eaf2", marginBottom: 6 },
  code: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 5,
    padding: "1px 5px",
    fontSize: 12.5,
    color: "#d9e3f0",
    wordBreak: "break-all",
  },
};

const LOGIN_CSS = `
  .adm-input:focus { border-color: #bef264 !important; box-shadow: 0 0 0 3px rgba(190,242,100,0.18); }
  .adm-input::placeholder { color: #6d7f77; }
  .adm-input:-webkit-autofill { -webkit-text-fill-color: #e6eaf2; transition: background-color 9999s ease-out; }
  .adm-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.04); }
  .adm-btn:active:not(:disabled) { transform: translateY(0); }
  .adm-btn:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
  .adm-outline:hover { border-color: rgba(190,242,100,0.6); color: #bef264; }
  .adm-link:hover { text-decoration: underline; }
  @media (max-width: 960px) {
    .adm-visual { display: none !important; }
    .adm-panel { flex: 1 1 100% !important; border-left: none !important; }
  }
`;

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
    return (
      <div style={{ ...styles.root, alignItems: "center", justifyContent: "center" }}>
        <style>{LOGIN_CSS}</style>
        Loading…
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div style={styles.root}>
      <style>{LOGIN_CSS}</style>

      {/* ── left: branded image panel ─────────────────────────────── */}
      <section className="adm-visual" style={styles.visual} aria-hidden="true">
        <div style={styles.visualShade} />
        <div style={styles.brand}>
          <span style={styles.brandMark}>💊</span>
          <span style={styles.brandName}>Pharma Careers</span>
          <span style={styles.brandTag}>Admin</span>
        </div>

        <div style={styles.pitch}>
          <div style={styles.pitchKicker}>Admin console</div>
          <h2 style={styles.pitchTitle}>
            Publish roles.
            <br />
            Review candidates.
            <br />
            One secure console.
          </h2>
          <p style={styles.pitchText}>
            Manage vacancies, screen applications and download resumes — protected by a
            server-side Firebase claim and allowlist.
          </p>
          <ul style={styles.features}>
            <li style={styles.feature}>
              <span style={styles.featureDot} /> Jobs, applications and site content in one place
            </li>
            <li style={styles.feature}>
              <span style={styles.featureDot} /> Candidates apply publicly — no candidate logins
            </li>
            <li style={styles.feature}>
              <span style={styles.featureDot} /> Resumes stored privately, served via signed URLs
            </li>
          </ul>
        </div>

        <div style={styles.visualFoot}>© {new Date().getFullYear()} Pharma Careers · Hyderabad, India</div>
      </section>

      {/* ── right: sign-in panel ──────────────────────────────────── */}
      <section className="adm-panel" style={styles.panel}>
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
                  className="adm-input"
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
                  className="adm-input"
                  style={styles.input}
                />
              </div>
              {error && <p style={styles.error}>{error}</p>}
              <button type="submit" disabled={submitting} className="adm-btn" style={styles.button}>
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>
          ) : resetSent ? (
            <div style={{ marginTop: 22 }}>
              <p style={styles.neutral}>{NEUTRAL_RESET_MESSAGE}</p>
              <p style={styles.muted}>If the address above is associated with an admin account, check your inbox for the reset link.</p>
              <button
                type="button"
                onClick={() => { setMode("login"); setResetSent(false); setError(null); }}
                className="adm-outline"
                style={{ ...styles.buttonOutline, marginTop: 16 }}
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
                  className="adm-input"
                  style={styles.input}
                />
              </div>
              {error && <p style={styles.error}>{error}</p>}
              <button type="submit" disabled={submitting || isResetCoolingDown} className="adm-btn" style={styles.button}>
                {isResetCoolingDown ? `Try again in ${resetCooldownSecondsLeft}s` : "Send reset link"}
              </button>
              <button
                type="button"
                onClick={() => { setMode("forgot"); setError(null); setResetSent(false); }}
                className="adm-outline"
                style={styles.buttonOutline}
              >
                Back to sign in
              </button>
            </form>
          )}

          {mode === "login" && (
            <div style={{ marginTop: 16, textAlign: "center" }}>
              <button type="button" onClick={() => { setMode("forgot"); setError(null); setResetSent(false); }} className="adm-link" style={styles.link}>
                Forgot password?
              </button>
            </div>
          )}

          <div style={styles.divider}>
            <div style={styles.helpTitle}>Password reset &amp; Firebase setup</div>
            <div style={styles.muted}>
              <p style={{ margin: "0 0 8px" }}>
                <strong>Reset email</strong> uses Firebase <code style={styles.code}>sendPasswordResetEmail</code>. The reset link uses
                the action URL configured in the Firebase Console → Authentication → Templates → Password reset
                email. Set the authorized domain and action URL (for example <code style={styles.code}>https://your-domain/admin/login</code>).
              </p>
              <p style={{ margin: 0 }}>
                <strong>Rate limit</strong>: a 60s cooldown is applied to the reset button to prevent spamming;
                Firebase also rate limits server-side.
              </p>
            </div>
          </div>

          {mode === "login" && (
            <p style={{ ...styles.muted, textAlign: "center" }}>
              <button type="button" onClick={handleSignOut} className="adm-link" style={styles.link}>
                Sign out
              </button>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
