import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmpty, AdminFlash } from "@/components/admin-flash";
import { USER_DETAIL_STATUSES } from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";
import {
  getUserDetailsStats,
  listUserDetails,
  userDetailKindLabel,
} from "@/lib/user-details";
import type { UserDetail } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "User details" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function kindClass(kind: UserDetail["kind"]): string {
  return kind === "job_application" ? "kind-application" : "kind-alert";
}

export default async function AdminUserDetailsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = first(params.q).trim().slice(0, 120);
  const kind = first(params.kind).trim();
  const status = first(params.status).trim();

  const records = listUserDetails({ search: q, kind, status });
  const stats = getUserDetailsStats();
  const filtered = Boolean(q || kind || status);

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>User Details</h1>
          <p>
            Job-alert registrations and resume submissions received from the public website.
          </p>
        </div>
        <div className="admin-actions">
          <Link href="/job-alerts" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            View public form
          </Link>
        </div>
      </div>

      <AdminFlash deleted={first(params.deleted) === "1"} error={first(params.error) || undefined} />

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-card-label">Total submissions</p>
          <p className="stat-card-value">{stats.total}</p>
          <p className="stat-card-note">Stored in this website&apos;s database</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">New</p>
          <p className="stat-card-value">{stats.newCount}</p>
          <p className="stat-card-note">Not reviewed yet</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Resumes attached</p>
          <p className="stat-card-value">{stats.resumes}</p>
          <p className="stat-card-note">Private, admin-only downloads</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Job applications</p>
          <p className="stat-card-value">{stats.applications}</p>
          <p className="stat-card-note">
            {stats.jobAlerts} job-alert {stats.jobAlerts === 1 ? "registration" : "registrations"}
          </p>
        </div>
      </div>

      <section className="admin-panel" aria-labelledby="user-details-table-heading">
        <div className="admin-panel-head">
          <div>
            <h2 id="user-details-table-heading">All submissions</h2>
            <p>
              {records.length} record{records.length === 1 ? "" : "s"} shown.
            </p>
          </div>
        </div>

        <form className="admin-filter-bar" action="/admin/user-details" method="get" role="search">
          <label className="sr-only" htmlFor="admin-details-search">
            Search submissions
          </label>
          <input
            className="input"
            id="admin-details-search"
            name="q"
            type="search"
            placeholder="Search name, email, phone or role…"
            defaultValue={q}
          />
          <label className="sr-only" htmlFor="admin-details-kind">
            Filter by type
          </label>
          <select className="select" id="admin-details-kind" name="kind" defaultValue={kind}>
            <option value="">All types</option>
            <option value="job_alert">Job alerts</option>
            <option value="job_application">Job applications</option>
          </select>
          <label className="sr-only" htmlFor="admin-details-status">
            Filter by status
          </label>
          <select className="select" id="admin-details-status" name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {USER_DETAIL_STATUSES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary btn-sm" type="submit">
            Filter
          </button>
          {filtered ? (
            <Link href="/admin/user-details" className="btn btn-ghost btn-sm">
              Clear
            </Link>
          ) : null}
        </form>

        {records.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Type</th>
                  <th>Role / source</th>
                  <th>Resume</th>
                  <th>Status</th>
                  <th>Received</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <div className="admin-table-title">
                        <Link href={`/admin/user-details/${record.id}`}>{record.name}</Link>
                      </div>
                      <p className="admin-table-sub">
                        {record.email}
                        {record.phone ? ` · ${record.phone}` : ""}
                      </p>
                    </td>
                    <td>
                      <span className={`kind-badge ${kindClass(record.kind)}`}>
                        {userDetailKindLabel(record.kind)}
                      </span>
                    </td>
                    <td>
                      {record.kind === "job_application" ? (
                        record.job_title ? (
                          record.job_title
                        ) : (
                          "Deleted job"
                        )
                      ) : (
                        <span className="muted-text">Job alerts</span>
                      )}
                    </td>
                    <td>
                      {record.has_resume ? (
                        <a
                          className="text-link"
                          href={`/admin/user-details/${record.id}/resume`}
                          rel="noopener"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="muted-text">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge status-${record.status}`}>
                        {record.status}
                      </span>
                    </td>
                    <td>{formatDateTime(record.created_at)}</td>
                    <td>
                      <Link
                        href={`/admin/user-details/${record.id}`}
                        className="btn btn-secondary btn-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmpty
            title={filtered ? "No matching submissions" : "No submissions yet"}
            description={
              filtered
                ? "Try a different search term, type or status."
                : "Submissions from the job-alerts popup, the /job-alerts page and job pages will appear here."
            }
            actionHref={filtered ? "/admin/user-details" : "/job-alerts"}
            actionLabel={filtered ? "Clear filters" : "Open public form"}
          />
        )}
      </section>
    </>
  );
}
