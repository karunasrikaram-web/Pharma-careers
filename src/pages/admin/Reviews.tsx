import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { adminFetch, formatDate } from "../../lib/adminApi";

interface Review {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  rating: number;
  content: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

const STATUS_STYLES: Record<Review["status"], { bg: string; fg: string }> = {
  pending: { bg: "#2d2a12", fg: "#f2c14e" },
  approved: { bg: "#123527", fg: "#5ee6a8" },
  rejected: { bg: "#3f1a1a", fg: "#ff9b9b" },
};

const FILTERS: Array<{ value: "" | Review["status"]; label: string }> = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminReviews() {
  const { user } = useAdminAuth();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [filter, setFilter] = useState<"" | Review["status"]>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoadError(null);
    try {
      const qs = filter ? `?status=${filter}` : "";
      const res = await adminFetch(user, `/api/admin/reviews${qs}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setLoadError(body.error ?? "Could not load reviews.");
        return;
      }
      const body = (await res.json()) as { reviews: Review[] };
      setReviews(body.reviews);
    } catch {
      setLoadError("Could not reach the server.");
    }
  }, [user, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const moderate = async (review: Review, status: Review["status"]) => {
    if (!user) return;
    setBusyId(review.id);
    try {
      const res = await adminFetch(user, "/api/admin/reviews", {
        method: "PATCH",
        body: JSON.stringify({ id: review.id, status }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setLoadError(body.error ?? "Action failed.");
      } else {
        await load();
      }
    } catch {
      setLoadError("Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (review: Review) => {
    if (!user) return;
    if (!window.confirm(`Delete review by "${review.name}"? This cannot be undone.`)) return;
    setBusyId(review.id);
    try {
      const res = await adminFetch(user, "/api/admin/reviews", {
        method: "DELETE",
        body: JSON.stringify({ id: review.id }),
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

  const renderStars = (rating: number) => "★".repeat(rating) + "☆".repeat(5 - rating);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Reviews</h1>
          <p style={{ color: "#9aa7bd", fontSize: 14, margin: 0 }}>
            Moderate candidate and employer reviews submitted from the public site.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              style={{
                padding: "8px 13px",
                borderRadius: 9,
                border: "1px solid #22304d",
                background: filter === f.value ? "#1a2440" : "transparent",
                color: filter === f.value ? "#e6eaf2" : "#9aa7bd",
                fontSize: 13.5,
                fontWeight: filter === f.value ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div style={{ background: "#3f1a1a", border: "1px solid #5d2626", color: "#ff9b9b", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 14 }}>
          {loadError}
        </div>
      )}

      {reviews === null ? (
        <div style={{ color: "#9aa7bd" }}>Loading reviews…</div>
      ) : reviews.length === 0 ? (
        <div style={{ background: "#121a2e", border: "1px solid #22304d", borderRadius: 14, padding: 28, textAlign: "center", color: "#9aa7bd" }}>
          No {filter ? filter : ""} reviews yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reviews.map((review) => {
            const busy = busyId === review.id;
            const s = STATUS_STYLES[review.status];
            return (
              <div key={review.id} style={{ background: "#121a2e", border: "1px solid #22304d", borderRadius: 14, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 220, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <strong style={{ fontSize: 15.5 }}>{review.name}</strong>
                      {review.role && (
                        <span style={{ color: "#9aa7bd", fontSize: 13 }}>{review.role}</span>
                      )}
                      <span
                        style={{
                          background: s.bg,
                          color: s.fg,
                          borderRadius: 999,
                          padding: "2px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {review.status}
                      </span>
                    </div>
                    <div style={{ color: "#f2c14e", fontSize: 15, marginTop: 6, letterSpacing: 2 }}>
                      {renderStars(review.rating)}
                    </div>
                    <p style={{ color: "#c6d0e0", fontSize: 14, marginTop: 6, marginBottom: 0, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                      {review.content}
                    </p>
                    <div style={{ color: "#5d6b85", fontSize: 12.5, marginTop: 10 }}>
                      {formatDate(review.created_at)}
                      {review.email ? ` · ${review.email}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                    {review.status !== "approved" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void moderate(review, "approved")}
                        style={{ padding: "8px 12px", borderRadius: 9, border: "none", background: "#1d4ed8", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}
                      >
                        Approve
                      </button>
                    )}
                    {review.status !== "rejected" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void moderate(review, "rejected")}
                        style={{ padding: "8px 12px", borderRadius: 9, border: "1px solid #22304d", background: "transparent", color: "#f2c14e", fontSize: 13.5, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}
                      >
                        Reject
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(review)}
                      style={{ padding: "8px 12px", borderRadius: 9, border: "1px solid #5d2626", background: "transparent", color: "#ff9b9b", fontSize: 13.5, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}
                    >
                      Delete
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