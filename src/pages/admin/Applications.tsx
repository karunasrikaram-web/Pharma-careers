import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import {
  adminFetch,
  APPLICATION_STATUSES,
  formatDate,
  STATUS_COLORS,
} from "../../lib/adminApi";

interface Application {
  id: string;
  job_id: string | null;
  job_title: string;
  company: string;
  applicant_name: string;
  surname: string;
  email: string;
  phone: string;
  location: string;
  cover_note: string | null;
  resume_filename: string | null;
  resume_size: number | null;
  status: string;
  created_at: string;
}

interface CompanyGroup {
  company: string;
  applications: Application[];
}

interface RoleGroup {
  title: string;
  jobs: Array<{ id: string; title: string; company: string | null; status: string }>;
  companies: CompanyGroup[];
  count: number;
  latest: string | null;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ApplicationCard({
  app,
  onStatusChange,
  onDelete,
  busy,
}: {
  app: Application;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (app: Application) => void;
  busy: boolean;
}) {
  const { user } = useAdminAuth();
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [loadingResume, setLoadingResume] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const c = STATUS_COLORS[app.status] ?? STATUS_COLORS.new;
  const fullName = [app.applicant_name, app.surname].filter(Boolean).join(" ");

  const openResume = async () => {
    if (resumeUrl) {
      window.open(resumeUrl, "_blank");
      return;
    }
    if (!user) return;
    setLoadingResume(true);
    setResumeError(null);
    try {
      const res = await adminFetch(user, `/api/admin/applications?resume=${encodeURIComponent(app.id)}`);
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        setResumeError(body.error ?? "Could not open resume.");
        return;
      }
      setResumeUrl(body.url);
      window.open(body.url, "_blank");
    } catch {
      setResumeError("Could not reach the server.");
    } finally {
      setLoadingResume(false);
    }
  };

  return (
    <div style={{ background: "#0e1526", border: "1px solid #1a2440", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 240, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <strong style={{ color: "#e6eaf2", fontSize: 15 }}>{fullName || "—"}</strong>
            <span style={{ background: c.bg, color: c.fg, borderRadius: 999, padding: "2px 9px", fontSize: 11.5, textTransform: "capitalize" }}>
              {app.status}
            </span>
          </div>

          {/* every detail the admin asked to see */}
          <div style={{ marginTop: 7, fontSize: 13.5, color: "#9aa7bd", lineHeight: 1.8 }}>
            <div>
              <span style={{ color: "#5d6b85" }}>Email · </span>
              <a href={`mailto:${app.email}`} style={{ color: "#7cc4ff", textDecoration: "none" }}>{app.email}</a>
            </div>
            <div>
              <span style={{ color: "#5d6b85" }}>Phone · </span>
              <a href={`tel:${app.phone}`} style={{ color: "#7cc4ff", textDecoration: "none" }}>{app.phone}</a>
            </div>
            <div>
              <span style={{ color: "#5d6b85" }}>Location · </span>
              {app.location || "—"}
            </div>
            <div>
              <span style={{ color: "#5d6b85" }}>Applied · </span>
              {formatDate(app.created_at)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
          {app.resume_filename ? (
            <button
              type="button"
              onClick={() => void openResume()}
              disabled={loadingResume}
              style={{ padding: "8px 12px", borderRadius: 9, border: "none", background: "#1d4ed8", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: loadingResume ? 0.6 : 1 }}
            >
              {loadingResume ? "Opening…" : `📄 Resume${app.resume_size ? ` (${formatSize(app.resume_size)})` : ""}`}
            </button>
          ) : null}
          <select
            value={app.status}
            disabled={busy}
            onChange={(e) => onStatusChange(app.id, e.target.value)}
            style={{ background: "#0e1526", border: "1px solid #22304d", borderRadius: 9, color: "#e6eaf2", padding: "8px 10px", fontSize: 13 }}
            aria-label={`Status for ${fullName}`}
          >
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onDelete(app)}
            disabled={busy}
            style={{ padding: "8px 12px", borderRadius: 9, border: "1px solid #5d2626", background: "transparent", color: "#ff9b9b", fontSize: 13, cursor: "pointer" }}
          >
            Delete
          </button>
        </div>
      </div>

      {resumeError && <div style={{ marginTop: 8, color: "#ff9b9b", fontSize: 13 }}>{resumeError}</div>}

      {app.cover_note && (
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={() => setNoteOpen((o) => !o)}
            style={{ background: "transparent", border: "none", color: "#7cc4ff", fontSize: 13, cursor: "pointer", padding: 0 }}
          >
            {noteOpen ? "Hide cover note ▲" : "Cover note ▼"}
          </button>
          {noteOpen && (
            <p style={{ color: "#9aa7bd", fontSize: 13.5, lineHeight: 1.6, margin: "8px 0 0", whiteSpace: "pre-wrap" }}>
              {app.cover_note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminApplications() {
  const { user } = useAdminAuth();
  const [roles, setRoles] = useState<RoleGroup[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const res = await adminFetch(user, "/api/admin/applications");
      const body = (await res.json().catch(() => ({}))) as { roles?: RoleGroup[]; total?: number; error?: string };
      if (!res.ok) {
        setError(body.error ?? "Could not load applications.");
        setRoles([]);
        return;
      }
      setRoles(body.roles ?? []);
      setTotal(body.total ?? 0);
      setError(null);
    } catch {
      setError("Could not reach the server.");
      setRoles([]);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeStatus = async (id: string, status: string) => {
    if (!user) return;
    setBusyId(id);
    try {
      const res = await adminFetch(user, "/api/admin/applications", {
        method: "PATCH",
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not update status.");
      } else {
        await load();
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteApp = async (app: Application) => {
    if (!user) return;
    const fullName = [app.applicant_name, app.surname].filter(Boolean).join(" ");
    if (!window.confirm(`Delete the application from ${fullName}? The resume file is removed too. This cannot be undone.`)) return;
    setBusyId(app.id);
    try {
      const res = await adminFetch(user, "/api/admin/applications", {
        method: "DELETE",
        body: JSON.stringify({ id: app.id }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not delete the application.");
      } else {
        await load();
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  };

  // status filter applied inside each company group
  const visibleRoles = (roles ?? []).map((role) => ({
    ...role,
    companies: role.companies
      .map((c) => ({
        ...c,
        applications: filter === "all" ? c.applications : c.applications.filter((a) => a.status === filter),
      }))
      .filter((c) => c.applications.length > 0 || filter === "all"),
  }));

  const anyApplicants = total > 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 26, color: "#e6eaf2", marginBottom: 4 }}>Applications</h1>
          <p style={{ color: "#9aa7bd", margin: 0 }}>
            {total === 0
              ? "No applications yet."
              : `${total} application${total === 1 ? "" : "s"} — grouped by role, then by company.`}
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ background: "#0e1526", border: "1px solid #22304d", borderRadius: 10, color: "#e6eaf2", padding: "9px 12px", fontSize: 14 }}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{ background: "#3f1a1a", border: "1px solid #5d2626", color: "#ff9b9b", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {roles === null ? (
        <div style={{ color: "#9aa7bd" }}>Loading applications…</div>
      ) : !anyApplicants ? (
        <div style={{ background: "#121a2e", border: "1px solid #22304d", borderRadius: 14, padding: 32, textAlign: "center", color: "#9aa7bd" }}>
          <p style={{ marginTop: 0, fontSize: 15.5, color: "#c6d0e0" }}>Nobody has applied yet.</p>
          <p style={{ marginBottom: 0, fontSize: 14 }}>
            When candidates apply on the public site, each application lands under its role and
            company here — with resume, phone, location and status tracking.{" "}
            <Link to="/admin/jobs" style={{ color: "#7cc4ff" }}>Post a job</Link> to start
            receiving them.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {visibleRoles.map((role) => (
            <div key={role.title} style={{ background: "#121a2e", border: "1px solid #22304d", borderRadius: 14, overflow: "hidden" }}>
              {/* ── ROLE header ─────────────────────────────────────────── */}
              <div style={{ padding: "13px 18px", borderBottom: "1px solid #22304d", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", background: "#141d33" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "#5d6b85", textTransform: "uppercase", letterSpacing: "0.08em" }}>Role</span>
                  <strong style={{ color: "#e6eaf2", fontSize: 15.5 }}>{role.title}</strong>
                  {role.jobs.some((j) => j.status === "published") && (
                    <span style={{ background: "#123527", color: "#5ee6a8", borderRadius: 999, padding: "2px 9px", fontSize: 11.5 }}>
                      live
                    </span>
                  )}
                  {role.jobs
                    .filter((j) => j.status === "published")
                    .map((j) => (
                      <Link key={j.id} to={`/jobs/${j.id}`} target="_blank" style={{ color: "#7cc4ff", fontSize: 12.5, textDecoration: "none" }}>
                        view ↗
                      </Link>
                    ))}
                </div>
                <span style={{ background: "#1a2440", color: "#9aa7bd", borderRadius: 999, padding: "3px 11px", fontSize: 12.5 }}>
                  {role.count} {role.count === 1 ? "applicant" : "applicants"} · {role.companies.length}{" "}
                  {role.companies.length === 1 ? "company" : "companies"}
                </span>
              </div>

              {/* ── COMPANY sections inside the role ─────────────────────── */}
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
                {role.companies.map((companyGroup) => (
                  <div key={companyGroup.company} style={{ border: "1px solid #1a2440", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ padding: "10px 14px", borderBottom: "1px solid #1a2440", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "#0e1526" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11.5, color: "#5d6b85", textTransform: "uppercase", letterSpacing: "0.08em" }}>Company</span>
                        <strong style={{ color: "#c6d0e0", fontSize: 14 }}>{companyGroup.company}</strong>
                      </div>
                      <span style={{ color: "#5d6b85", fontSize: 12.5 }}>
                        {companyGroup.applications.length}{" "}
                        {companyGroup.applications.length === 1 ? "applicant" : "applicants"}
                      </span>
                    </div>

                    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                      {companyGroup.applications.length === 0 ? (
                        <div style={{ color: "#5d6b85", fontSize: 13.5, padding: "6px 4px" }}>
                          {filter === "all" ? "No applications for this role at this company yet." : `No ${filter} applications here.`}
                        </div>
                      ) : (
                        companyGroup.applications.map((app) => (
                          <ApplicationCard
                            key={app.id}
                            app={app}
                            busy={busyId === app.id}
                            onStatusChange={(id, status) => void changeStatus(id, status)}
                            onDelete={(a) => void deleteApp(a)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
