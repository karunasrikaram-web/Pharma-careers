import { useEffect, useState, type FormEvent } from "react";

interface PublicReview {
  id: string;
  name: string;
  role: string | null;
  rating: number;
  content: string;
  created_at: string;
}

interface ApiResponse {
  ok?: boolean;
  error?: string;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ color: "#f2c14e", letterSpacing: 2 }} aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      {"☆".repeat(5 - rating)}
    </span>
  );
}

export default function Reviews() {
  const [reviews, setReviews] = useState<PublicReview[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/reviews");
        if (!res.ok) throw new Error();
        const body = (await res.json()) as { reviews: PublicReview[] };
        if (!cancelled) setReviews(body.reviews);
      } catch {
        if (!cancelled) setLoadError("Could not load reviews right now.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!name.trim() || !content.trim()) {
      setError("Please fill in your name and review.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          role: role.trim() || undefined,
          rating,
          content: content.trim(),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as ApiResponse;
      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again shortly.");
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again shortly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page">
      <div className="container page-narrow">
        <span className="pill">Reviews</span>
        <h1>What people say</h1>
        <p className="lede">
          Experiences from candidates and hiring teams on Pharma Careers. Submit your own below —
          reviews are moderated before they appear publicly.
        </p>

        {loadError && <p className="form-error">{loadError}</p>}

        {reviews === null ? (
          <p style={{ color: "#5d6b85" }}>Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p style={{ color: "#5d6b85" }}>No reviews yet — be the first to share your experience.</p>
        ) : (
          <div style={{ display: "grid", gap: 16, marginBottom: 40 }}>
            {reviews.map((r) => (
              <article
                key={r.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e4e8f0",
                  borderRadius: 14,
                  padding: "18px 20px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <strong style={{ fontSize: 15.5 }}>{r.name}</strong>
                  <Stars rating={r.rating} />
                </div>
                {r.role && <div style={{ color: "#5d6b85", fontSize: 13, marginTop: 4 }}>{r.role}</div>}
                <p style={{ color: "#2a3448", fontSize: 14.5, marginTop: 10, marginBottom: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {r.content}
                </p>
              </article>
            ))}
          </div>
        )}

        <h2 style={{ fontSize: 22, marginBottom: 8 }}>Write a review</h2>
        <p className="lede" style={{ marginBottom: 20 }}>
          Share your experience to help others in the life-sciences community.
        </p>

        {sent ? (
          <div className="form-success" style={{ maxWidth: 640 }}>
            Thanks — your review has been received and will appear once it is approved.
          </div>
        ) : (
          <form className="form" onSubmit={handleSubmit} noValidate style={{ maxWidth: 640 }}>
            {error && <p className="form-error">{error}</p>}
            <div className="field">
              <label htmlFor="review-name">Name *</label>
              <input
                id="review-name"
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="field">
              <label htmlFor="review-email">Email (optional)</label>
              <input
                id="review-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="field">
              <label htmlFor="review-role">Your role / company (optional)</label>
              <input
                id="review-role"
                name="role"
                type="text"
                placeholder="e.g. QA Analyst at Sunrise Biotech"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="field">
              <label htmlFor="review-rating">Rating *</label>
              <select
                id="review-rating"
                name="rating"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                disabled={submitting}
              >
                <option value={5}>5 — Excellent</option>
                <option value={4}>4 — Good</option>
                <option value={3}>3 — Average</option>
                <option value={2}>2 — Poor</option>
                <option value={1}>1 — Very poor</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="review-content">Your review *</label>
              <textarea
                id="review-content"
                name="content"
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit review"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}