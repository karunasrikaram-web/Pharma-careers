import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";

type AuthState = "checking" | "unauthenticated" | "forbidden" | "admin" | "error";

export default function AdminDashboard() {
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
        res = await fetch("/api/admin/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // network failure / API server not running locally
        if (!cancelled) setAuthState("error");
        return;
      }
      const body: { admin?: boolean; email?: string; error?: string } = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (res.status === 401) {
        setAuthState("unauthenticated");
        return;
      }
      if (res.status === 403) {
        setAuthState("forbidden");
        return;
      }
      if (res.ok && body?.admin) {
        setAuthState("admin");
        setAdminEmail(body?.email ?? user.email ?? null);
        return;
      }
      // 5xx / unexpected: show an error state — never flip to "unauthenticated",
      // which would bounce the user to /admin/login and back in a loop.
      setAuthState("error");
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user, loading, signOut]);

  useEffect(() => {
    if (authState === "unauthenticated") {
      navigate("/admin/login", { replace: true });
    }
  }, [authState, navigate]);

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading…</div>;
  }

  if (authState === "unauthenticated") {
    return <div style={{ minHeight: "100vh" }} />;
  }

  if (authState === "forbidden") {
    return <AdminAccessDeniedInline email={user?.email ?? null} />;
  }

  if (authState === "error") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "#0b1020", color: "#e6eaf2" }}>
        <div style={{ maxWidth: 560, textAlign: "center", background: "#121a2e", border: "1px solid #22304d", borderRadius: 16, padding: 32 }}>
          <h1 style={{ fontSize: 24, color: "#e6eaf2" }}>Can&apos;t reach the server</h1>
          <p style={{ color: "#9aa7bd" }}>
            The admin API is not responding{user?.email ? ` (signed in as ${user.email})` : ""}. If you are
            running the site locally, make sure <code>npm run dev</code> is running (it starts both the
            website and the API), then retry.
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

  if (authState !== "admin") {
    return <div style={{ minHeight: "100vh" }} />;
  }

  const handleSignOut = async () => {
    try {
      const token = await user?.getIdToken();
      if (token) {
        await fetch("/api/admin/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // best-effort server-side sign-out; client sign-out always runs below
    }
    await signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b1020", color: "#e6eaf2" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid #22304d" }}>
        <strong>Pharma Careers · Admin</strong>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#9aa7bd", fontSize: 14 }}>{adminEmail ?? user?.email}</span>
          <button type="button" onClick={handleSignOut} style={{ background: "transparent", border: "1px solid #22304d", color: "#c6d0e0", borderRadius: 10, padding: "8px 12px", cursor: "pointer" }}>
            Sign out
          </button>
        </div>
      </header>
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 28, color: "#e6eaf2" }}>Admin dashboard</h1>
        <p style={{ color: "#9aa7bd" }}>
          Firebase admin verified. Server-side authorization via the <code>admin: true</code> custom claim.
        </p>
      </main>
    </div>
  );
}

function AdminAccessDeniedInline({ email }: { email: string | null }) {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "#0b1020" }}>
      <div style={{ maxWidth: 560, textAlign: "center", background: "#121a2e", border: "1px solid #22304d", borderRadius: 16, padding: 32 }}>
        <h1 style={{ fontSize: 28, color: "#e6eaf2" }}>Access denied</h1>
        <p style={{ color: "#9aa7bd" }}>
          Your account{email ? ` (${email})` : ""} is signed in, but it does not have the Firebase admin claim
          required to view this area.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
          <button type="button" onClick={() => navigate("/admin/login", { replace: true })} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 10, padding: "11px 14px", fontWeight: 600, cursor: "pointer" }}>
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
