import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";

type AuthState = "checking" | "unauthenticated" | "forbidden" | "admin" | "error";

const NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: "▦" },
  { to: "/admin/jobs", label: "Jobs", icon: "☰" },
  { to: "/admin/applications", label: "Applications", icon: "✦" },
  { to: "/admin/contact-messages", label: "Contact", icon: "✉" },
  { to: "/admin/reviews", label: "Reviews", icon: "★" },
];

/**
 * Shared console layout: verifies the admin once (/api/admin/me), then renders
 * the sidebar + header and whatever page the route selects. Any 5xx/network
 * failure shows a retry card instead of bouncing to login (no redirect loops).
 */
export default function AdminShell() {
  const { user, loading, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setAuthState("unauthenticated");
      return;
    }
    let cancelled = false;
    const run = async () => {
      const token = await user.getIdToken();
      let res: Response;
      try {
        res = await fetch("/api/admin/me", { headers: { Authorization: `Bearer ${token}` } });
      } catch {
        if (!cancelled) setAuthState("error");
        return;
      }
      const body: { admin?: boolean; email?: string } = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (res.status === 401) setAuthState("unauthenticated");
      else if (res.status === 403) setAuthState("forbidden");
      else if (res.ok && body?.admin) {
        setAuthState("admin");
        setAdminEmail(body?.email ?? user.email ?? null);
      } else setAuthState("error");
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  useEffect(() => {
    if (authState === "unauthenticated") navigate("/admin/login", { replace: true });
  }, [authState, navigate]);

  if (loading || authState === "checking" || authState === "unauthenticated") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b1020", color: "#9aa7bd" }}>
        Loading…
      </div>
    );
  }

  if (authState === "forbidden") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "#0b1020" }}>
        <div style={{ maxWidth: 560, textAlign: "center", background: "#121a2e", border: "1px solid #22304d", borderRadius: 16, padding: 32 }}>
          <h1 style={{ fontSize: 28, color: "#e6eaf2" }}>Access denied</h1>
          <p style={{ color: "#9aa7bd" }}>
            Your account{user?.email ? ` (${user.email})` : ""} is signed in, but it does not have the Firebase
            admin claim required to view this area.
          </p>
          <button type="button" onClick={() => navigate("/admin/login", { replace: true })} style={{ marginTop: 16, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 10, padding: "11px 14px", fontWeight: 600, cursor: "pointer" }}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (authState === "error") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "#0b1020", color: "#e6eaf2" }}>
        <div style={{ maxWidth: 560, textAlign: "center", background: "#121a2e", border: "1px solid #22304d", borderRadius: 16, padding: 32 }}>
          <h1 style={{ fontSize: 24, color: "#e6eaf2" }}>Can&apos;t reach the server</h1>
          <p style={{ color: "#9aa7bd" }}>
            The admin API is not responding{user?.email ? ` (signed in as ${user.email})` : ""}. If you are running
            the site locally, make sure <code>npm run dev</code> is running, then retry.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
            <button type="button" onClick={() => window.location.reload()} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 10, padding: "11px 14px", fontWeight: 600, cursor: "pointer" }}>
              Retry
            </button>
            <button type="button" onClick={() => { void signOut(); }} style={{ background: "transparent", border: "1px solid #22304d", color: "#c6d0e0", borderRadius: 10, padding: "11px 14px", cursor: "pointer" }}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    try {
      const token = await user?.getIdToken();
      if (token) {
        await fetch("/api/admin/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      }
    } catch {
      // best-effort server-side sign-out; client sign-out always runs below
    }
    await signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b1020", color: "#e6eaf2", display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid #22304d" }}>
        <strong>Pharma Careers · Admin</strong>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#9aa7bd", fontSize: 14 }}>{adminEmail ?? user?.email}</span>
          <button type="button" onClick={handleSignOut} style={{ background: "transparent", border: "1px solid #22304d", color: "#c6d0e0", borderRadius: 10, padding: "8px 12px", cursor: "pointer" }}>
            Sign out
          </button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <nav style={{ width: 210, borderRight: "1px solid #22304d", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                textDecoration: "none",
                fontSize: 14.5,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#e6eaf2" : "#9aa7bd",
                background: isActive ? "#1a2440" : "transparent",
              })}
            >
              <span aria-hidden style={{ width: 18, textAlign: "center", opacity: 0.85 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
          <div style={{ marginTop: "auto", padding: "12px 12px 4px", fontSize: 12, color: "#5d6b85", lineHeight: 1.5 }}>
            Server-side authorized
            <br />
            via admin claim + allowlist
          </div>
        </nav>

        <main style={{ flex: 1, padding: 24, minWidth: 0, overflowX: "hidden" }}>
          <Outlet context={{ adminEmail }} />
        </main>
      </div>
    </div>
  );
}
