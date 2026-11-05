import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { adminFetch, formatDate } from "../../lib/adminApi";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  created_at: string;
}

export default function AdminContactMessages() {
  const { user } = useAdminAuth();
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoadError(null);
    try {
      const res = await adminFetch(user, "/api/admin/contact-messages");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setLoadError(body.error ?? "Could not load messages.");
        return;
      }
      const body = (await res.json()) as { messages: ContactMessage[] };
      setMessages(body.messages);
    } catch {
      setLoadError("Could not reach the server.");
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (msg: ContactMessage) => {
    if (!user) return;
    if (!window.confirm(`Delete message from "${msg.name}"? This cannot be undone.`)) return;
    setBusyId(msg.id);
    try {
      const res = await adminFetch(user, "/api/admin/contact-messages", {
        method: "DELETE",
        body: JSON.stringify({ id: msg.id }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setLoadError(body.error ?? "Delete failed.");
      } else {
        await load();
      }
    } catch {
      setLoadError("Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Contact messages</h1>
          <p style={{ color: "#9aa7bd", fontSize: 14, margin: 0 }}>
            Messages submitted from the public contact form.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          style={{ background: "transparent", border: "1px solid #22304d", color: "#c6d0e0", borderRadius: 10, padding: "9px 14px", cursor: "pointer" }}
        >
          Refresh
        </button>
      </div>

      {loadError && (
        <div style={{ background: "#3f1a1a", border: "1px solid #5d2626", color: "#ff9b9b", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 14 }}>
          {loadError}
        </div>
      )}

      {messages === null ? (
        <div style={{ color: "#9aa7bd" }}>Loading messages…</div>
      ) : messages.length === 0 ? (
        <div style={{ background: "#121a2e", border: "1px solid #22304d", borderRadius: 14, padding: 28, textAlign: "center", color: "#9aa7bd" }}>
          No contact messages yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.map((msg) => {
            const busy = busyId === msg.id;
            return (
              <div key={msg.id} style={{ background: "#121a2e", border: "1px solid #22304d", borderRadius: 14, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 220, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <strong style={{ fontSize: 15.5 }}>{msg.name}</strong>
                      <a href={`mailto:${msg.email}`} style={{ color: "#7cc4ff", fontSize: 13.5 }}>
                        {msg.email}
                      </a>
                    </div>
                    {msg.subject && (
                      <div style={{ color: "#e6eaf2", fontSize: 14, marginTop: 6, fontWeight: 600 }}>
                        {msg.subject}
                      </div>
                    )}
                    <p style={{ color: "#c6d0e0", fontSize: 14, marginTop: 6, marginBottom: 0, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                      {msg.message}
                    </p>
                    <div style={{ color: "#5d6b85", fontSize: 12.5, marginTop: 10 }}>
                      {formatDate(msg.created_at)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(msg)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 9,
                        border: "1px solid #5d2626",
                        background: "transparent",
                        color: "#ff9b9b",
                        fontSize: 13.5,
                        cursor: busy ? "default" : "pointer",
                        opacity: busy ? 0.6 : 1,
                      }}
                    >
                      {busy ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}