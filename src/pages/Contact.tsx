import { useState, type FormEvent } from "react";

interface ApiResponse {
  ok?: boolean;
  error?: string;
}

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in your name, email and message.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), subject: subject.trim() || undefined, message: message.trim() }),
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
    <>
      <section className="page">
          <div className="container page-narrow">
            <span className="pill">Contact</span>
            <h1>Get in touch</h1>
            <p className="lede">
              Questions about a listing, hiring, or anything else — send us a message and we will
              reply as soon as we can.
            </p>

            {sent ? (
              <div className="form-success" style={{ maxWidth: 640 }}>
                Thanks — your message has been received. We will get back to you shortly.
              </div>
            ) : (
              <form className="form" onSubmit={handleSubmit} noValidate>
                {error && <p className="form-error">{error}</p>}
                <div className="field">
                  <label htmlFor="contact-name">Name</label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="field">
                  <label htmlFor="contact-email">Email</label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="field">
                  <label htmlFor="contact-subject">Subject (optional)</label>
                  <input
                    id="contact-subject"
                    name="subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="field">
                  <label htmlFor="contact-message">Message</label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Sending…" : "Send message"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
    </>
  );
}
