import type { Metadata } from "next";
import Link from "next/link";
import { AdminFlash } from "@/components/admin-flash";
import { setJobStatusAction, toggleFeaturedAction } from "@/actions/jobs";
import { AdminEmpty } from "@/components/admin-flash";
import { getAdminJobs } from "@/lib/jobs";
import { getRegistrationConfig, getSettings, isEnabled } from "@/lib/settings";
import { formatDate, isExpired, todayIST } from "@/lib/dates";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Job alerts" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function daysUntil(date: string, today: string): number {
  const start = Date.parse(`${today}T00:00:00Z`);
  const end = Date.parse(`${date}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

function JobAlertRow({ job, today }: { job: Job; today: string }) {
  const expired = isExpired(job.application_deadline, today);
  const days = job.application_deadline ? daysUntil(job.application_deadline, today) : null;
  return (
    <tr>
      <td>
        <div className="admin-table-title">
          <Link href={`/admin/jobs/${job.id}/edit`}>{job.title}</Link>
        </div>
        <p className="admin-table-sub">
          {job.company_name} · {job.city}, {job.state}
        </p>
      </td>
      <td>{job.department}</td>
      <td>
        <span className={`status-badge status-${expired ? "expired" : job.status}`}>
          {expired ? "expired" : job.status}
        </span>
      </td>
      <td>
        {job.application_deadline ? (
          <>
            {formatDate(job.application_deadline)}
            {days !== null && days >= 0 ? (
              <span className="admin-table-sub">
                {days === 0 ? "Closes today" : `${days} day${days === 1 ? "" : "s"} left`}
              </span>
            ) : null}
          </>
        ) : (
          "—"
        )}
      </td>
      <td>
        <div className="admin-table-actions">
          <form action={toggleFeaturedAction}>
            <input type="hidden" name="id" value={job.id} />
            <input type="hidden" name="return_to" value="/admin/job-alerts" />
            <button className="btn btn-secondary btn-sm" type="submit">
              {job.is_featured ? "Unfeature" : "Feature"}
            </button>
          </form>
          {job.status === "published" ? (
            <form action={setJobStatusAction}>
              <input type="hidden" name="id" value={job.id} />
              <input type="hidden" name="status" value="draft" />
              <input type="hidden" name="return_to" value="/admin/job-alerts" />
              <button className="btn btn-ghost btn-sm" type="submit">
                Unpublish
              </button>
            </form>
          ) : (
            <form action={setJobStatusAction}>
              <input type="hidden" name="id" value={job.id} />
              <input type="hidden" name="status" value="published" />
              <input type="hidden" name="return_to" value="/admin/job-alerts" />
              <button className="btn btn-primary btn-sm" type="submit">
                Publish
              </button>
            </form>
          )}
          <Link
            href={`/admin/jobs/${job.id}/edit`}
            className="btn btn-ghost btn-sm"
          >
            Edit
          </Link>
        </div>
      </td>
    </tr>
  );
}

export default async function JobAlertsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const today = todayIST();
  const allJobs = getAdminJobs({});
  const published = allJobs.filter((job) => job.status === "published");
  const activePublished = published.filter((job) => !isExpired(job.application_deadline, today));
  const recent = [...activePublished]
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
    .slice(0, 8);
  const featured = allJobs.filter((job) => job.is_featured && !isExpired(job.application_deadline, today));
  const expiring = published
    .filter((job) => {
      if (!job.application_deadline) return false;
      const days = daysUntil(job.application_deadline, today);
      return days >= 0 && days <= 14;
    })
    .sort((a, b) => (a.application_deadline ?? "").localeCompare(b.application_deadline ?? ""));

  const popup = getRegistrationConfig();
  const settings = getSettings();

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>Job Alerts</h1>
          <p>Homepage listing visibility, featured vacancies and the job-seeker registration popup.</p>
        </div>
        <div className="admin-actions">
          <Link href="/admin/jobs/new" className="btn btn-primary btn-sm">
            Create Job
          </Link>
          <Link href="/admin/settings" className="btn btn-secondary btn-sm">
            Configure popup
          </Link>
        </div>
      </div>

      <AdminFlash saved={first(params.saved) === "1"} error={first(params.error) || undefined} />

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-card-label">Active published jobs</p>
          <p className="stat-card-value">{activePublished.length}</p>
          <p className="stat-card-note">Not past the application deadline</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Featured alerts</p>
          <p className="stat-card-value">{featured.length}</p>
          <p className="stat-card-note">Prioritised on public listings</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Expiring in 14 days</p>
          <p className="stat-card-value">{expiring.length}</p>
          <p className="stat-card-note">Review deadlines or extend them</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Homepage jobs</p>
          <p className="stat-card-value">{isEnabled(settings.homepage_show_jobs) ? "On" : "Off"}</p>
          <p className="stat-card-note">Manage in Settings</p>
        </div>
      </div>

      <section className="admin-panel" aria-labelledby="popup-status-heading">
        <div className="admin-panel-head">
          <div>
            <h2 id="popup-status-heading">Job-seeker registration popup</h2>
            <p>Built-in form — submissions are stored in this dashboard under User Details.</p>
          </div>
          <Link href="/admin/settings" className="btn btn-secondary btn-sm">
            Edit settings
          </Link>
        </div>
        <div className="admin-panel-body">
          <div className="admin-form-grid">
            <div>
              <p className="stat-card-label">Status</p>
              <p style={{ fontWeight: 650 }}>
                {isEnabled(settings.registration_popup_enabled)
                  ? "Enabled"
                  : "Disabled"}
              </p>
            </div>
            <div>
              <p className="stat-card-label">Automatic trigger</p>
              <p style={{ fontWeight: 650 }}>{popup.delaySeconds} seconds after arrival</p>
            </div>
            <div>
              <p className="stat-card-label">Submission destination</p>
              <p className="admin-hint">
                This website&apos;s database. Review entries in{" "}
                <Link href="/admin/user-details" className="text-link">
                  User Details
                </Link>
                .
              </p>
            </div>
            <div>
              <p className="stat-card-label">Email / push notifications</p>
              <p className="admin-hint">
                Not configured. Submissions are stored for manual review; this application does
                not send alert emails.
              </p>
            </div>
          </div>
          <p className="admin-hint" style={{ marginTop: 16 }}>
            The popup is shown once per browsing session. Visitors can dismiss it and reopen it
            at any time with the &ldquo;Register for Job Alerts&rdquo; button, or use the
            dedicated{" "}
            <Link href="/job-alerts" className="text-link" target="_blank" rel="noopener noreferrer">
              job alerts page
            </Link>
            . Resumes submitted with job applications appear in the same User Details area.
          </p>
        </div>
      </section>

      <section className="admin-panel" aria-labelledby="recent-vacancies-heading">
        <div className="admin-panel-head">
          <div>
            <h2 id="recent-vacancies-heading">Recent published vacancies</h2>
            <p>Latest active listings currently visible to the public.</p>
          </div>
        </div>
        {recent.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Deadline</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((job) => (
                  <JobAlertRow key={job.id} job={job} today={today} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmpty
            title="No active published jobs"
            description="Publish a verified vacancy to make it available on the public site."
            actionHref="/admin/jobs/new"
            actionLabel="Create Job"
          />
        )}
      </section>

      <div className="admin-two-col">
        <section className="admin-panel" aria-labelledby="expiring-heading">
          <div className="admin-panel-head">
            <div>
              <h2 id="expiring-heading">Expiring soon</h2>
              <p>Deadlines in the next 14 days. Expired jobs hide automatically.</p>
            </div>
          </div>
          {expiring.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table" style={{ minWidth: 620 }}>
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Deadline</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expiring.map((job) => (
                    <JobAlertRow key={job.id} job={job} today={today} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty">
              <strong>No deadlines approaching</strong>
              <p>No published vacancy closes in the next 14 days.</p>
            </div>
          )}
        </section>

        <section className="admin-panel" aria-labelledby="featured-heading">
          <div className="admin-panel-head">
            <div>
              <h2 id="featured-heading">Featured alerts</h2>
              <p>Featured jobs appear first on the homepage and job directory.</p>
            </div>
          </div>
          {featured.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table" style={{ minWidth: 420 }}>
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {featured.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <div className="admin-table-title">{job.title}</div>
                        <p className="admin-table-sub">{job.company_name}</p>
                      </td>
                      <td>
                        <span className={`status-badge status-${job.status}`}>{job.status}</span>
                      </td>
                      <td>
                        <form action={toggleFeaturedAction}>
                          <input type="hidden" name="id" value={job.id} />
                          <input type="hidden" name="return_to" value="/admin/job-alerts" />
                          <button className="btn btn-ghost btn-sm" type="submit">
                            Unfeature
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty">
              <strong>No featured jobs</strong>
              <p>Feature a published vacancy to prioritise it.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
