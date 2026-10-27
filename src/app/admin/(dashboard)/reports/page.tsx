import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmpty, AdminFlash } from "@/components/admin-flash";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { deleteReportAction, updateReportStatusAction } from "@/actions/admin";
import { getReportCounts, listJobReports } from "@/lib/admin-data";
import { formatDateTime } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Listing reports" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUSES = ["open", "resolved"] as const;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const requestedStatus = first(params.status).trim();
  const status = (STATUSES as readonly string[]).includes(requestedStatus)
    ? requestedStatus
    : "";
  const reports = listJobReports(status || undefined);
  const counts = getReportCounts();

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>Listing Reports</h1>
          <p>Problems reported by visitors on public job pages.</p>
        </div>
      </div>

      <AdminFlash
        updated={first(params.updated) === "1"}
        deleted={first(params.deleted) === "1"}
        error={first(params.error) || undefined}
        successMessage={
          first(params.deleted) === "1"
            ? "The report was deleted."
            : "The report was updated."
        }
      />

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-card-label">Total reports</p>
          <p className="stat-card-value">{counts.total}</p>
          <p className="stat-card-note">All listing reports received</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Open</p>
          <p className="stat-card-value">{counts.open}</p>
          <p className="stat-card-note">Still need review</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Resolved</p>
          <p className="stat-card-value">{counts.resolved}</p>
          <p className="stat-card-note">Reviewed and closed</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Showing</p>
          <p className="stat-card-value">{reports.length}</p>
          <p className="stat-card-note">
            {status ? `Filtered to ${status} reports` : "All reports"}
          </p>
        </div>
      </div>

      <section className="admin-panel" aria-labelledby="reports-table-heading">
        <div className="admin-panel-head">
          <div>
            <h2 id="reports-table-heading">
              {status ? `${status[0].toUpperCase()}${status.slice(1)} reports` : "All reports"}
            </h2>
            <p>
              {reports.length} report{reports.length === 1 ? "" : "s"} shown.
            </p>
          </div>
        </div>

        <form className="admin-filter-bar" action="/admin/reports" method="get">
          <label className="sr-only" htmlFor="admin-report-status">
            Filter by status
          </label>
          <select className="select" id="admin-report-status" name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {STATUSES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary btn-sm" type="submit">
            Filter
          </button>
          {status ? (
            <Link href="/admin/reports" className="btn btn-ghost btn-sm">
              Clear
            </Link>
          ) : null}
        </form>

        {reports.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table" style={{ minWidth: 940 }}>
              <thead>
                <tr>
                  <th>Listing</th>
                  <th>Reason</th>
                  <th>Reporter</th>
                  <th>Status</th>
                  <th>Received</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <div className="admin-table-title">
                        {report.job_title ? (
                          <Link href={`/admin/jobs/${report.job_id}/edit`}>
                            {report.job_title}
                          </Link>
                        ) : (
                          "Listing no longer exists"
                        )}
                      </div>
                      {report.job_slug ? (
                        <p className="admin-table-sub">/jobs/{report.job_slug}</p>
                      ) : null}
                    </td>
                    <td>
                      <strong>{report.reason}</strong>
                      {report.details ? (
                        <p className="admin-message-body">{report.details}</p>
                      ) : null}
                    </td>
                    <td>
                      {report.reporter_email ? (
                        <a className="text-link" href={`mailto:${report.reporter_email}`}>
                          {report.reporter_email}
                        </a>
                      ) : (
                        <span className="muted-text">Not provided</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge status-${report.status}`}>
                        {report.status}
                      </span>
                    </td>
                    <td>{formatDateTime(report.created_at)}</td>
                    <td>
                      <div className="admin-table-actions">
                        <form action={updateReportStatusAction}>
                          <input type="hidden" name="id" value={report.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={report.status === "open" ? "resolved" : "open"}
                          />
                          <button className="btn btn-secondary btn-sm" type="submit">
                            {report.status === "open" ? "Mark resolved" : "Reopen"}
                          </button>
                        </form>
                        <form action={deleteReportAction}>
                          <input type="hidden" name="id" value={report.id} />
                          <ConfirmSubmitButton message="Delete this report permanently? This cannot be undone.">
                            Delete
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmpty
            title={status ? `No ${status} reports` : "No reports yet"}
            description={
              status
                ? "Try a different status filter."
                : "Reports submitted from public job pages will appear here."
            }
            actionHref={status ? "/admin/reports" : "/jobs"}
            actionLabel={status ? "Clear filter" : "Browse jobs"}
          />
        )}
      </section>
    </>
  );
}
