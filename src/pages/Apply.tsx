import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchPublishedJobs, type PublicJob } from "../lib/publicJobs";

const MAX_RESUME_BYTES = 3 * 1024 * 1024;
const ACCEPT = ".pdf,.doc,.docx";
const ALLOWED_EXT = /\.(pdf|doc|docx)$/i;

interface ApiResponse {
  ok?: boolean;
  error?: string;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

const norm = (value: string) => value.trim().toLowerCase();

/**
 * Public application page. No login, no account — the candidate fills in their
 * details, picks the role (and company) from the dropdown, attaches a resume
 * and submits. The dropdown marks, with a "+", every role that this email has
 * already applied for (at any company), so nobody applies twice for the same
 * role.
 */
export default function Apply() {
  const [searchParams] = useSearchParams();
  const preselectJobId = searchParams.get("job");

  const [jobs, setJobs] = useState<PublicJob[] | null>(null);
  const [jobsError, setJobsError] = useState(false);

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [jobId, setJobId] = useState("");
  const [coverNote, setCoverNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [appliedRoles, setAppliedRoles] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── published roles (real vacancies only — samples cannot be applied to) ──
  useEffect(() => {
    let cancelled = false;
    fetchPublishedJobs()
      .then((rows) => {
        if (cancelled) return;
        setJobs(rows);
        if (preselectJobId && rows.some((j) => j.id === preselectJobId)) {
          setJobId(preselectJobId);
        }
      })
      .catch(() => {
        if (!cancelled) setJobsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [preselectJobId]);

  // ── duplicate check: which roles has this email already applied for? ─────
  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    const emailValue = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setAppliedRoles(new Set());
      return;
    }
    checkTimer.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/check-application", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emailValue }),
          });
          const body = (await res.json().catch(() => ({}))) as { appliedRoles?: string[] };
          if (res.ok) setAppliedRoles(new Set((body.appliedRoles ?? []).map((r) => r.trim().toLowerCase())));
        } catch {
          // offline / API down — the server still enforces the rule on submit
        }
      })();
    }, 450);
    return () => {
      if (checkTimer.current) clearTimeout(checkTimer.current);
    };
  }, [email]);

  // ── role dropdown, grouped by role title ────────────────────────────────
  const roleGroups = useMemo(() => {
    const map = new Map<string, { title: string; jobs: PublicJob[] }>();
    for (const job of jobs ?? []) {
      const key = norm(job.title);
      const group = map.get(key);
      if (group) group.jobs.push(job);
      else map.set(key, { title: job.title.trim(), jobs: [job] });
    }
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [jobs]);

  const selectedJob = useMemo(
    () => (jobs ?? []).find((j) => j.id === jobId) ?? null,
    [jobs, jobId]
  );

  const selectedRoleApplied = selectedJob ? appliedRoles.has(norm(selectedJob.title)) : false;

  const sameRoleElsewhere = useMemo(() => {
    if (!selectedJob) return [];
    return (jobs ?? []).filter(
      (j) => norm(j.title) === norm(selectedJob.title) && j.id !== selectedJob.id
    );
  }, [jobs, selectedJob]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const chosen = e.target.files?.[0] ?? null;
    if (!chosen) {
      setFile(null);
      return;
    }
    if (!ALLOWED_EXT.test(chosen.name)) {
      setError("Please attach your resume as a PDF, DOC or DOCX file.");
      e.target.value = "";
      setFile(null);
      return;
    }
    if (chosen.size > MAX_RESUME_BYTES) {
      setError("That file is larger than 3 MB. Please attach a smaller resume.");
      e.target.value = "";
      setFile(null);
      return;
    }
    setFile(chosen);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!name.trim() || !surname.trim()) {
      setError("Please enter your name and surname.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (phone.trim().length < 5) {
      setError("Please enter your phone number.");
      return;
    }
    if (!location.trim()) {
      setError("Please enter your location (city or district).");
      return;
    }
    if (!jobId) {
      setError("Please choose the role you are applying for.");
      return;
    }
    if (!file) {
      setError("Please attach your resume (PDF, DOC or DOCX, up to 3 MB).");
      return;
    }
    if (selectedRoleApplied) {
      setError(
        `You have already applied for the "${selectedJob?.title}" role${
          selectedJob ? ` at ${selectedJob.company}` : ""
        }. You can apply only once per role — pick a different role below.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const dataBase64 = await readFileAsBase64(file);
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          name: name.trim(),
          surname: surname.trim(),
          email: email.trim(),
          phone: phone.trim(),
          location: location.trim(),
          coverNote: coverNote.trim() || undefined,
          resume: { filename: file.name, contentType: file.type || "application/octet-stream", dataBase64 },
        }),
      });
      const body = (await res.json().catch(() => ({}))) as ApiResponse;
      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again shortly.");
        if (res.status === 409) {
          // refresh the "+" badges so the UI agrees with the server
          setAppliedRoles((prev) => new Set(prev).add(selectedJob ? norm(selectedJob.title) : ""));
        }
        return;
      }
      setSent(selectedJob ? `${selectedJob.title} — ${selectedJob.company}` : "the selected role");
    } catch {
      setError("Something went wrong. Please try again shortly.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <section className="page">
        <div className="container page-narrow">
          <h1>Application submitted</h1>
          <div className="form-success" style={{ maxWidth: 640 }}>
            <strong>Thank you, {name} {surname}.</strong> Your application for{" "}
            <strong>{sent}</strong> has been received. If your profile matches, our team will
            contact you at <strong>{email}</strong>.
          </div>
          <p style={{ marginTop: 24 }}>
            <Link className="section-note" to="/jobs">← Browse more jobs</Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="container page-narrow">
        <h1>Apply for a role</h1>
        <p className="lede">
          No account and no login needed — fill in your details, choose the role, attach your
          resume and submit. Fields marked * are required.
        </p>

        {jobsError && (
          <p className="form-error">
            We could not load the open roles right now. Please refresh the page in a moment.
          </p>
        )}

        {jobs && jobs.length === 0 && !jobsError && (
          <div className="form-success" style={{ maxWidth: 640 }}>
            There are no open roles at the moment.{" "}
            <Link to="/contact">Send us your details</Link> and we will keep your resume on file.
          </div>
        )}

        {jobs && jobs.length > 0 && (
          <form className="form" onSubmit={handleSubmit} noValidate>
            {error && <p className="form-error">{error}</p>}

            <div className="field-row">
              <div className="field">
                <label htmlFor="ap-name">First name *</label>
                <input
                  id="ap-name"
                  name="name"
                  type="text"
                  autoComplete="given-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="field">
                <label htmlFor="ap-surname">Surname *</label>
                <input
                  id="ap-surname"
                  name="surname"
                  type="text"
                  autoComplete="family-name"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="ap-email">Email *</label>
                <input
                  id="ap-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="field">
                <label htmlFor="ap-phone">Phone number *</label>
                <input
                  id="ap-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="ap-location">Your location (city / district) *</label>
              <input
                id="ap-location"
                name="location"
                type="text"
                autoComplete="address-level2"
                placeholder="Hyderabad, Telangana"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="field">
              <label htmlFor="ap-role">Role you are applying for *</label>
              <select
                id="ap-role"
                name="role"
                value={jobId}
                onChange={(e) => {
                  setJobId(e.target.value);
                  setError(null);
                }}
                disabled={submitting}
              >
                <option value="">Choose a role…</option>
                {roleGroups.map((group) => (
                  <optgroup
                    key={group.title}
                    label={
                      group.jobs.length > 1
                        ? `${group.title}  —  +${group.jobs.length - 1} more compan${
                            group.jobs.length > 2 ? "ies" : "y"
                          } hiring`
                        : group.title
                    }
                  >
                    {group.jobs.map((job) => {
                      const applied = appliedRoles.has(norm(job.title));
                      return (
                        <option key={job.id} value={job.id}>
                          {applied ? "＋ " : ""}
                          {job.company}
                          {job.location ? ` — ${job.location}` : ""}
                          {applied ? "  (already applied)" : ""}
                        </option>
                      );
                    })}
                  </optgroup>
                ))}
              </select>
              <p className="hint">
                A "＋" marks a role you have already applied for — you can apply only once per
                role.
              </p>
            </div>

            {selectedRoleApplied && (
              <p className="form-error">
                ＋ You already applied for <strong>{selectedJob?.title}</strong>
                {selectedJob ? ` at ${selectedJob.company}` : ""}. Choose a different role to
                continue.
              </p>
            )}

            {!selectedRoleApplied && sameRoleElsewhere.length > 0 && (
              <p className="hint-warning">
                The same role is also offered by{" "}
                {sameRoleElsewhere.map((j) => j.company).join(", ")}. Applying here counts as
                your single application for this role.
              </p>
            )}

            <div className="field">
              <label htmlFor="ap-note">Cover note (optional)</label>
              <textarea
                id="ap-note"
                name="coverNote"
                rows={4}
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                disabled={submitting}
                placeholder="A few lines about your experience and why you are interested…"
              />
            </div>

            <div className="field">
              <label htmlFor="ap-resume">Resume * (PDF, DOC or DOCX — max 3 MB)</label>
              <input
                id="ap-resume"
                name="resume"
                type="file"
                accept={ACCEPT}
                onChange={onFileChange}
                disabled={submitting}
              />
            </div>

            <div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit application"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
