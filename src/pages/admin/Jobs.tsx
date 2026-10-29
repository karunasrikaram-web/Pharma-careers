import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import {
  adminFetch,
  EMPLOYMENT_TYPES,
  formatDate,
  LOCATION_TYPES,
  STATUS_COLORS,
} from "../../lib/adminApi";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  location_type: string;
  employment_type: string;
  level: string | null;
  category: string | null;
  description: string | null;
  requirements: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  status: string;
  published_at: string | null;
  created_at: string;
}

interface JobForm {
  title: string;
  company: string;
  location: string;
  location_type: string;
  employment_type: string;
  level: string;
  category: string;
  description: string;
  requirements: string;
  salary_min: string;
  salary_max: string;
  currency: string;
  status: string;
}

const EMPTY_FORM: JobForm = {
  title: "",
  company: "",
  location: "",
  location_type: "onsite",
  employment_type: "full_time",
  level: "",
  category: "",
  description: "",
  requirements: "",
  salary_min: "",
  salary_max: "",
  currency: "INR",
  status: "draft",
};

const CATEGORIES = [
  "Quality Assurance",
  "Production",
  "Research & Development",
  "Regulatory Affairs",
  "Clinical Research",
  "Pharmacovigilance",
  "Sales & Marketing",
  "Analytical Development",
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0e1526",
  border: "1px solid #22304d",
  borderRadius: 10,
  color: "#e6eaf2",
  padding: "10px 12px",
  fontSize: 14.5,
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, color: "#9aa7bd", marginBottom: 6 };

function JobFormPanel({
  initial,
  saving,
  error,
  onSave,
  onCancel,
}: {
  initial: JobForm;
  saving: boolean;
  error: string | null;
  onSave: (form: JobForm) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<JobForm>(initial);
  const set = (key: keyof JobForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      style={{ background: "#121a2e", border: "1px solid #22304d", borderRadius: 14, padding: 20, marginBottom: 20 }}
    >
      {error && (
        <div style={{ background: "#3f1a1a", border: "1px solid #5d2626", color: "#ff9b9b", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 14 }}>
          {error}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        <div>
          <label style={labelStyle}>Job title *</label>
          <input required style={inputStyle} value={form.title} onChange={set("title")} placeholder="Senior QA Officer" />
        </div>
        <div>
          <label style={labelStyle}>Company *</label>
          <input required style={inputStyle} value={form.company} onChange={set("company")} placeholder="Sunrise Biotech Ltd" />
        </div>
        <div>
          <label style={labelStyle}>Location</label>
          <input style={inputStyle} value={form.location} onChange={set("location")} placeholder="Hyderabad, Telangana" />
        </div>
        <div>
          <label style={labelStyle}>Work model</label>
          <select style={inputStyle} value={form.location_type} onChange={set("location_type")}>
            {LOCATION_TYPES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Employment type</label>
          <select style={inputStyle} value={form.employment_type} onChange={set("employment_type")}>
            {EMPLOYMENT_TYPES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Level</label>
          <input style={inputStyle} value={form.level} onChange={set("level")} placeholder="Mid–Senior level" />
        </div>
        <div>
          <label style={labelStyle}>Department</label>
          <select style={inputStyle} value={form.category} onChange={set("category")}>
            <option value="">(none)</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Currency</label>
          <input style={inputStyle} value={form.currency} onChange={set("currency")} placeholder="INR" />
        </div>
        <div>
          <label style={labelStyle}>Salary min (per year)</label>
          <input style={inputStyle} value={form.salary_min} onChange={set("salary_min")} inputMode="numeric" placeholder="900000" />
        </div>
        <div>
          <label style={labelStyle}>Salary max (per year)</label>
          <input style={inputStyle} value={form.salary_max} onChange={set("salary_max")} inputMode="numeric" placeholder="1400000" />
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={form.status} onChange={set("status")}>
            <option value="draft">Draft (hidden from site)</option>
            <option value="published">Published (live on site)</option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <label style={labelStyle}>About the role</label>
        <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} value={form.description} onChange={set("description")} placeholder="What the person will do day to day…" />
      </div>
      <div style={{ marginTop: 14 }}>
        <label style={labelStyle}>Requirements</label>
        <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} value={form.requirements} onChange={set("requirements")} placeholder="Qualifications, experience, skills…" />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button type="submit" disabled={saving} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 10, padding: "11px 18px", fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving…" : "Save job"}
        </button>
        <button type="button" onClick={onCancel} style={{ background: "transparent", border: "1px solid #22304d", color: "#c6d0e0", borderRadius: 10, padding: "11px 16px", cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AdminJobs() {
  const { user } = useAdminAuth();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panel, setPanel] = useState<"closed" | "create" | { edit: Job }>("closed");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const res = await adminFetch(user, "/api/admin/jobs");
      const body = (await res.json().catch(() => ({}))) as { jobs?: Job[]; error?: string };
      if (!res.ok) {
        setLoadError(body.error ?? "Could not load jobs.");
        setJobs([]);
        return;
      }
      setJobs(body.jobs ?? []);
      setLoadError(null);
    } catch {
      setLoadError("Could not reach the server.");
      setJobs([]);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const toPayload = (f: JobForm) => ({
    title: f.title.trim(),
    company: f.company.trim(),
    location: f.location.trim() || null,
    locationType: f.location_type,
    employmentType: f.employment_type,
    level: f.level.trim() || null,
    category: f.category || null,
    description: f.description.trim() || null,
    requirements: f.requirements.trim() || null,
    salaryMin: f.salary_min.trim() ? Number(f.salary_min) : null,
    salaryMax: f.salary_max.trim() ? Number(f.salary_max) : null,
    currency: f.currency.trim() || null,
    status: f.status,
  });

  const handleSave = async (f: JobForm) => {
    if (!user) return;
    if (!f.title.trim() || !f.company.trim()) {
      setFormError("Job title and company are required.");
      return;
    }
    if (f.salary_min.trim() && Number.isNaN(Number(f.salary_min))) {
      setFormError("Salary min must be a number.");
      return;
    }
    if (f.salary_max.trim() && Number.isNaN(Number(f.salary_max))) {
      setFormError("Salary max must be a number.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const isEdit = typeof panel === "object";
      const res = isEdit
        ? await adminFetch(user, "/api/admin/jobs", {
            method: "PATCH",
            body: JSON.stringify({ id: (panel as { edit: Job }).edit.id, ...toPayload(f) }),
          })
        : await adminFetch(user, "/api/admin/jobs", { method: "POST", body: JSON.stringify(toPayload(f)) });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setFormError(body.error ?? "Could not save the job.");
        return;
      }
      setPanel("closed");
      await load();
    } catch {
      setFormError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  };

  const action = async (job: Job, path: string, method: "POST" | "DELETE" = "POST") => {
    if (!user) return;
    setBusyId(job.id);
    try {
      const res = await adminFetch(user, path, { method, body: JSON.stringify({ id: job.id }) });
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

  const confirmDelete = (job: Job) => {
    if (window.confirm(`Delete "${job.title}" permanently? Its applications will be kept but shown as unassigned.`)) {
      void action(job, "/api/admin/jobs", "DELETE");
    }
  };

  const toForm = (j: Job): JobForm => ({
    title: j.title,
    company: j.company,
    location: j.location ?? "",
    location_type: j.location_type,
    employment_type: j.employment_type,
    level: j.level ?? "",
    category: j.category ?? "",
    description: j.description ?? "",
    requirements: j.requirements ?? "",
    salary_min: j.salary_min != null ? String(j.salary_min) : "",
    salary_max: j.salary_max != null ? String(j.salary_max) : "",
    currency: j.currency ?? "INR",
    status: j.status === "archived" ? "draft" : j.status,
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, color: "#e6eaf2", marginBottom: 4 }}>Jobs</h1>
          <p style={{ color: "#9aa7bd", margin: 0 }}>
            Upload and control every vacancy on the public site. Published jobs appear instantly.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setPanel("create");
          }}
          style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 10, padding: "11px 16px", fontWeight: 600, cursor: "pointer", fontSize: 15 }}
        >
          + New job
        </button>
      </div>

      {loadError && (
        <div style={{ background: "#3f1a1a", border: "1px solid #5d2626", color: "#ff9b9b", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
          {loadError}
        </div>
      )}

      {panel !== "closed" && (
        <JobFormPanel
          initial={typeof panel === "object" ? toForm(panel.edit) : EMPTY_FORM}
          saving={saving}
          error={formError}
          onSave={handleSave}
          onCancel={() => setPanel("closed")}
        />
      )}

      {jobs === null ? (
        <div style={{ color: "#9aa7bd" }}>Loading jobs…</div>
      ) : jobs.length === 0 ? (
        <div style={{ background: "#121a2e", border: "1px solid #22304d", borderRadius: 14, padding: 28, textAlign: "center", color: "#9aa7bd" }}>
          No jobs yet. Click <strong style={{ color: "#e6eaf2" }}>+ New job</strong> to post your first vacancy.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {jobs.map((job) => {
            const c = STATUS_COLORS[job.status] ?? STATUS_COLORS.draft;
            const busy = busyId === job.id;
            return (
              <div key={job.id} style={{ background: "#121a2e", border: "1px solid #22304d", borderRadius: 14, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 220, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <strong style={{ fontSize: 16, color: "#e6eaf2" }}>{job.title}</strong>
                      <span style={{ background: c.bg, color: c.fg, borderRadius: 999, padding: "3px 10px", fontSize: 12, textTransform: "capitalize" }}>
                        {job.status}
                      </span>
                    </div>
                    <div style={{ color: "#9aa7bd", fontSize: 14, marginTop: 5 }}>
                      {job.company}
                      {job.location ? ` · ${job.location}` : ""}
                      {job.category ? ` · ${job.category}` : ""}
                    </div>
                    <div style={{ color: "#5d6b85", fontSize: 12.5, marginTop: 4 }}>
                      Created {formatDate(job.created_at)}
                      {job.status === "published" && job.published_at ? ` · live since ${formatDate(job.published_at)}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                    {job.status === "published" ? (
                      <Link to={`/jobs/${job.id}`} target="_blank" style={{ padding: "8px 12px", borderRadius: 9, border: "1px solid #22304d", color: "#7cc4ff", fontSize: 13.5, textDecoration: "none" }}>
                        View ↗
                      </Link>
                    ) : null}
                    <button type="button" disabled={busy} onClick={() => { setFormError(null); setPanel({ edit: job }); }} style={{ padding: "8px 12px", borderRadius: 9, border: "1px solid #22304d", background: "transparent", color: "#c6d0e0", fontSize: 13.5, cursor: "pointer" }}>
                      Edit
                    </button>
                    {job.status !== "published" ? (
                      <button type="button" disabled={busy} onClick={() => void action(job, "/api/admin/jobs/publish")} style={{ padding: "8px 12px", borderRadius: 9, border: "none", background: "#1d4ed8", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
                        Publish
                      </button>
                    ) : (
                      <button type="button" disabled={busy} onClick={() => void action(job, "/api/admin/jobs/unpublish")} style={{ padding: "8px 12px", borderRadius: 9, border: "1px solid #22304d", background: "transparent", color: "#f2c14e", fontSize: 13.5, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
                        Unpublish
                      </button>
                    )}
                    {job.status !== "archived" && (
                      <button type="button" disabled={busy} onClick={() => void action(job, "/api/admin/jobs/archive")} style={{ padding: "8px 12px", borderRadius: 9, border: "1px solid #22304d", background: "transparent", color: "#9aa7bd", fontSize: 13.5, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
                        Archive
                      </button>
                    )}
                    <button type="button" disabled={busy} onClick={() => confirmDelete(job)} style={{ padding: "8px 12px", borderRadius: 9, border: "1px solid #5d2626", background: "transparent", color: "#ff9b9b", fontSize: 13.5, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
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
