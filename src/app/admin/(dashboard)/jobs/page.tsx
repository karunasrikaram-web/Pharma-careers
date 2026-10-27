import Link from "next/link";
import type { Metadata } from "next";
import { AdminEmpty, AdminFlash } from "@/components/admin-flash";
import { PlusIcon } from "@/components/admin-icons";
import { getAdminJobs } from "@/lib/jobs";
import { formatDate, isExpired } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Manage jobs" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function statusFor(job: { status: string; application_deadline: string | null }) {
  if (job.status === "published" && isExpired(job.application_deadline)) {
    return { label: "expired", className: "status-expired" };
  }
  return { label: job.status, className: `status-${job.status}` };
}

export default async function AdminJobsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = first(params.q).trim().slice(0, 120);
  const status = first(params.status).trim();
  const jobs = await getAdminJobs({ search: q, status });

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>Manage Jobs</h1>
          <p>Create, publish, feature and archive job vacancies.</p>
        </div>
        <div className="admin-actions">
          <Link href="/admin/jobs/new" className="btn btn-primary btn-sm">
            <PlusIcon size={14} /> Create Job
          </Link>
        </div>
      </div>

      <AdminFlash
        saved={first(params.saved) === "1"}
        deleted={first(params.deleted) === "1"}
        error={first(params.error) || undefined}
      />

      <section className="admin-panel" aria-labelledby="jobs-table-heading">
        <div className="admin-panel-head">
          <div>
            <h2 id="jobs-table-heading">All job records</h2>
            <p>{jobs.length} record{jobs.length === 1 ? "" : "s"} shown.</p>
          </div>
        </div>

        <form className="admin-filter-bar" action="/admin/jobs" method="get" role="search">
          <label className="sr-only" htmlFor="admin-job-search">
            Search jobs
          </label>
          <input
            className="input"
            id="admin-job-search"
            name="q"
            type="search"
            placeholder="Search title, company, city…"
            defaultValue={q}
          />
          <label className="sr-only" htmlFor="admin-job-status">
            Filter by status
          </label>
          <select className="select" id="admin-job-status" name="status" defaultValue={status}>
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="expired">Expired</option>
            <option value="archived">Archived</option>
          </select>
          <button className="btn btn-secondary btn-sm" type="submit">
            Filter
          </button>
          {q || status ? (
            <Link href="/admin/jobs" className="btn btn-ghost btn-sm">
              Clear
            </Link>
          ) : null}
        </form>

        {jobs.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Department</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Deadline</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const badge = statusFor(job);
                  return (
                    <tr key={job.id}>
                      <td>
                        <div className="admin-table-title">
                          <Link href={`/admin/jobs/${job.id}/edit`}>{job.title}</Link>
                        </div>
                        <p className="admin-table-sub">
                          {job.company_name}
                          {job.is_featured ? " · Featured" : ""}
                          {job.is_demo ? " · Demo" : ""}
                        </p>
                      </td>
                      <td>{job.department}</td>
                      <td>
                        {job.city}, {job.state}
                      </td>
                      <td>
                        <span className={`status-badge ${badge.className}`}>{badge.label}</span>
                      </td>
                      <td>{job.application_deadline ? formatDate(job.application_deadline) : "—"}</td>
                      <td>{formatDate(job.updated_at)}</td>
                      <td>
                        <div className="admin-table-actions">
                          <Link
                            href={`/admin/jobs/${job.id}/edit`}
                            className="btn btn-secondary btn-sm"
                          >
                            Edit
                          </Link>
                          {job.status === "published" && !isExpired(job.application_deadline) ? (
                            <Link
                              href={`/jobs/${job.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-sm"
                            >
                              View
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmpty
            title={q || status ? "No matching jobs" : "No jobs yet"}
            description={
              q || status
                ? "Try a different search term or status filter."
                : "Create the first vacancy to populate the public job directory."
            }
            actionHref={q || status ? "/admin/jobs" : "/admin/jobs/new"}
            actionLabel={q || status ? "Clear filters" : "Create Job"}
          />
        )}
      </section>
    </>
  );
}
