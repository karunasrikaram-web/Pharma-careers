import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { adminFetch, formatDate, STATUS_COLORS } from "../../lib/adminApi";

interface Job {
  id: string;
  title: string;
  company: string;
  status: string;
  published_at: string | null;
  created_at: string;
}

interface Application {
  id: string;
  job_id: string | null;
  job_title: string;
  company: string;
  applicant_name: string;
  surname: string;
  email: string;
  status: string;
  created_at: string;
}

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div style={{ background: "#121a2e", border: "1px solid #22304d", borderRadius: 14, padding: "18px 20px", minWidth: 150, flex: 1 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#e6eaf2" }}>{value}</div>
      <div style={{ fontSize: 13.5, color: "#9aa7bd", marginTop: 4 }}>{label}</div>
      {hint && <div style={{ fontSize: 12, color: "#5d6b85", marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAdminAuth();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const run = async () => {
      try {
        const [jobsRes, appsRes] = await Promise.all([
          adminFetch(user, "/api/admin/jobs"),
          adminFetch(user, "/api/admin/applications"),
        ]);
        const jobsBody = (await jobsRes.json().catch(() => ({}))) as { jobs?: Job[]; error?: string };
        const appsBody = (await appsRes.json().catch(() => ({}))) as {
          roles?: Array<{ title: string; companies: Array<{ company: string; applications: Application[] }> }>;
          total?: number;
          error?: string;
        };
        if (cancelled) return;
        if (!jobsRes.ok || !appsRes.ok) {
          setError(
            jobsBody.error ??
              appsBody.error ??
              "Could not load dashboard data. If the site is running locally, check that npm run dev is running."
          );
          return;
        }
        setJobs(jobsBody.jobs ?? []);
        const flat = (appsBody.roles ?? []).flatMap((r) => r.companies.flatMap((c) => c.applications));
        setApplications(flat);
      } catch {
        if (!cancelled) setError("Could not reach the server.");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const published = jobs?.filter((j) => j.status === "published") ?? [];
  const drafts = jobs?.filter((j) => j.status === "draft") ?? [];
  const newApps = applications?.filter((a) => a.status === "new") ?? [];
  const recentApps = (applications ?? []).slice(0, 6);

  return (
    <div>
      <h1 style={{ fontSize: 26, color: "#e6eaf2", marginBottom: 4 }}>Admin dashboard</h1>
      <p style={{ color: "#9aa7bd", marginTop: 0, marginBottom: 20 }}>
        Control the public website: post vacancies, publish or pull them instantly, and review
        candidate applications grouped under each role.
      </p>

      {error && (
        <div style={{ background: "#3f1a1a", border: "1px solid #5d2626", color: "#ff9b9b", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="Published jobs (live on site)" value={jobs ? published.length : "…"} />
        <StatCard label="Draft jobs (hidden)" value={jobs ? drafts.length : "…"} />
        <StatCard label="Total applications" value={applications ? applications.length : "…"} />
        <StatCard label="New applications" value={applications ? newApps.length : "…"} />
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
        <Link to="/admin/jobs" className="btn btn-primary" style={{ textDecoration: "none" }}>
          + Post a new job
        </Link>
        <Link
          to="/admin/applications"
          style={{ display: "inline-flex", alignItems: "center", padding: "11px 16px", borderRadius: 10, border: "1px solid #22304d", color: "#c6d0e0", textDecoration: "none", fontWeight: 600, fontSize: 15 }}
        >
          Review applications
        </Link>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          style={{ display: "inline-flex", alignItems: "center", padding: "11px 16px", borderRadius: 10, border: "1px solid #22304d", color: "#c6d0e0", textDecoration: "none", fontWeight: 600, fontSize: 15 }}
        >
          View public site ↗
        </a>
      </div>

      <div style={{ background: "#121a2e", border: "1px solid #22304d", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #22304d", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: 15 }}>Recent applications</strong>
          <Link to="/admin/applications" style={{ color: "#7cc4ff", fontSize: 13.5, textDecoration: "none" }}>
            View all →
          </Link>
        </div>
        {applications === null ? (
          <div style={{ padding: 20, color: "#9aa7bd" }}>Loading…</div>
        ) : recentApps.length === 0 ? (
          <div style={{ padding: 20, color: "#9aa7bd" }}>
            No applications yet. When candidates apply on the public site, they will appear here.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <tbody>
              {recentApps.map((app) => {
                const c = STATUS_COLORS[app.status] ?? STATUS_COLORS.new;
                return (
                  <tr key={app.id} style={{ borderBottom: "1px solid #1a2440" }}>
                    <td style={{ padding: "11px 20px", color: "#e6eaf2", fontWeight: 500 }}>
                      {[app.applicant_name, app.surname].filter(Boolean).join(" ")}
                    </td>
                    <td style={{ padding: "11px 12px", color: "#9aa7bd" }}>
                      {app.job_title}
                      {app.company ? ` · ${app.company}` : ""}
                    </td>
                    <td style={{ padding: "11px 12px", color: "#5d6b85" }}>{formatDate(app.created_at)}</td>
                    <td style={{ padding: "11px 20px", textAlign: "right" }}>
                      <span style={{ background: c.bg, color: c.fg, borderRadius: 999, padding: "3px 10px", fontSize: 12, textTransform: "capitalize" }}>
                        {app.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
