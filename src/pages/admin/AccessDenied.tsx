import { Navigate, useLocation } from "react-router-dom";

export default function AdminAccessDenied() {
  const location = useLocation();
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 560, textAlign: "center", background: "#121a2e", border: "1px solid #22304d", borderRadius: 16, padding: 32 }}>
        <h1 style={{ fontSize: 28 }}>Access denied</h1>
        <p style={{ color: "#9aa7bd" }}>
          Your account is signed in, but it does not have the Firebase admin claim required to view this
          area.
        </p>
        <p style={{ color: "#9aa7bd", fontSize: 13 }}>
          Path: <code>{location.pathname}</code>
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
          <Navigate to="/admin/login" replace />
        </div>
      </div>
    </div>
  );
}
