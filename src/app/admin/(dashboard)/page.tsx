import Link from "next/link";
import type { Metadata } from "next";
import { FileIcon, PlusIcon, BriefcaseIcon, UsersIcon } from "@/components/admin-icons";
import { getDashboardStats, getRecentJobs } from "@/lib/jobs";
import { getArticleStats, listAdminArticles } from "@/lib/articles";
import {
  getRecentUserDetails,
  getUserDetailsStats,
  userDetailKindLabel,
} from "@/lib/user-details";
import { getMessageCounts, getReportCounts } from "@/lib/admin-data";
import { formatDate, formatDateTime, isExpired, todayIST } from "@/lib/dates";
import type { Article, Job } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard" };

function jobStatusLabel(job: Job): { label: string; className: string } {
  if (job.status === "published" && isExpired(job.application_deadline)) {
    return { label: "expired", className: "status-expired" };
  }
  return { label: job.status, className: `status-${job.status}` };
}

export default function AdminDashboardPage() {
  const jobStats = getDashboardStats();
  const articleStats = getArticleStats();
  const userStats = getUserDetailsStats();
  const messageStats = getMessageCounts();
  const reportStats = getReportCounts();
  const recentJobs = getRecentJobs(6);
  const recentArticles = (listAdminArticles() as Article[]).slice(0, 5);
  const recentUserDetails = getRecentUserDetails(5);

  const today = todayIST();
  const soon = new Date(`${today}T00:00:00Z`);
  soon.setUTCDate(soon.getUTCDate() + 14);
  const expiring = recentJobs.filter(
    (job) =>
      job.status === "published" &&
      job.application_deadline &&
      job.application_deadline >= today &&
      job.application_deadline <= soon.toISOString().slice(0, 10),
  ).length;

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Live counts and recent publishing activity from the database.</p>
        </div>
        <div className="admin-actions">
          <Link href="/admin/jobs/new" className="btn btn-primary btn-sm">
            <PlusIcon size={14} /> Create Job
          </Link>
          <Link href="/admin/articles/new" className="btn btn-secondary btn-sm">
            <FileIcon size={14} /> Create Article
          </Link>
          <Link href="/admin/user-details" className="btn btn-secondary btn-sm">
            <UsersIcon size={14} /> User Details
          </Link>
        </div>
      </div>

      <section aria-labelledby="job-stats-heading">
        <h2 id="job-stats-heading" className="sr-only">
          Job statistics
        </h2>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-card-label">Total jobs</p>
            <p className="stat-card-value">{jobStats.total}</p>
            <p className="stat-card-note">All records in the database</p>
          </div>
          <div className="stat-card">
            <p className="stat-card-label">Published jobs</p>
            <p className="stat-card-value">{jobStats.published}</p>
            <p className="stat-card-note">Visible and not expired</p>
          </div>
          <div className="stat-card">
            <p className="stat-card-label">Draft jobs</p>
            <p className="stat-card-value">{jobStats.drafts}</p>
            <p className="stat-card-note">Private until published</p>
          </div>
          <div className="stat-card">
            <p className="stat-card-label">Expired jobs</p>
            <p className="stat-card-value">{jobStats.expired}</p>
            <p className="stat-card-note">Past application deadline</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="article-stats-heading">
        <h2 id="article-stats-heading" className="sr-only">
          Article statistics
        </h2>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-card-label">Total articles</p>
            <p className="stat-card-value">{articleStats.total}</p>
            <p className="stat-card-note">Drafts, published and archived</p>
          </div>
          <div className="stat-card">
            <p className="stat-card-label">Published articles</p>
            <p className="stat-card-value">{articleStats.published}</p>
            <p className="stat-card-note">
              {articleStats.scheduled} scheduled for later
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-card-label">Draft articles</p>
            <p className="stat-card-value">{articleStats.drafts}</p>
            <p className="stat-card-note">Never shown publicly</p>
          </div>
          <div className="stat-card">
            <p className="stat-card-label">Expiring soon</p>
            <p className="stat-card-value">{expiring}</p>
            <p className="stat-card-note">Job deadlines in the next 14 days</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="user-details-stats-heading">
        <h2 id="user-details-stats-heading" className="sr-only">
          User details statistics
        </h2>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-card-label">User submissions</p>
            <p className="stat-card-value">{userStats.total}</p>
            <p className="stat-card-note">Job alerts and job applications</p>
          </div>
          <div className="stat-card">
            <p className="stat-card-label">Awaiting review</p>
            <p className="stat-card-value">{userStats.newCount}</p>
            <p className="stat-card-note">Status still set to new</p>
          </div>
          <div className="stat-card">
            <p className="stat-card-label">Job applications</p>
            <p className="stat-card-value">{userStats.applications}</p>
            <p className="stat-card-note">
              {userStats.jobAlerts} job-alert{" "}
              {userStats.jobAlerts === 1 ? "registration" : "registrations"}
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-card-label">Resumes received</p>
            <p className="stat-card-value">{userStats.resumes}</p>
            <p className="stat-card-note">Downloadable by administrators only</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="inbox-stats-heading">
        <h2 id="inbox-stats-heading" className="sr-only">
          Messages and reports statistics
        </h2>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-card-label">New messages</p>
            <p className="stat-card-value">{messageStats.unread}</p>
            <p className="stat-card-note">
              <Link href="/admin/messages?status=new" className="text-link">
                Review messages
              </Link>
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-card-label">Open reports</p>
            <p className="stat-card-value">{reportStats.open}</p>
            <p className="stat-card-note">
              <Link href="/admin/reports?status=open" className="text-link">
                Review reports
              </Link>
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-card-label">Total messages</p>
            <p className="stat-card-value">{messageStats.total}</p>
            <p className="stat-card-note">Contact-form messages received</p>
          </div>
          <div className="stat-card">
            <p className="stat-card-label">Total reports</p>
            <p className="stat-card-value">{reportStats.total}</p>
            <p className="stat-card-note">Listing reports received</p>
          </div>
        </div>
      </section>

      <div className="admin-two-col">
        <section className="admin-panel" aria-labelledby="recent-jobs-heading">
          <div className="admin-panel-head">
            <div>
              <h2 id="recent-jobs-heading">Recently updated jobs</h2>
              <p>Latest six job records by update time.</p>
            </div>
            <Link href="/admin/jobs" className="btn btn-secondary btn-sm">
              Manage jobs
            </Link>
          </div>
          <div className="admin-panel-body admin-panel-body-flush">
            {recentJobs.length > 0 ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Status</th>
                      <th>Updated</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {recentJobs.map((job) => {
                      const status = jobStatusLabel(job);
                      return (
                        <tr key={job.id}>
                          <td>
                            <div className="admin-table-title">
                              <Link href={`/admin/jobs/${job.id}/edit`}>{job.title}</Link>
                            </div>
                            <p className="admin-table-sub">
                              {job.company_name} · {job.city}, {job.state}
                            </p>
                          </td>
                          <td>
                            <span className={`status-badge ${status.className}`}>
                              {status.label}
                            </span>
                          </td>
                          <td>{formatDate(job.updated_at)}</td>
                          <td>
                            <Link
                              href={`/admin/jobs/${job.id}/edit`}
                              className="btn btn-secondary btn-sm"
                            >
                              Edit
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty">
                <strong>No jobs yet</strong>
                <p>Create your first vacancy to populate the public job directory.</p>
                <Link
                  href="/admin/jobs/new"
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 14 }}
                >
                  <BriefcaseIcon size={14} /> Create Job
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="admin-panel" aria-labelledby="recent-articles-heading">
          <div className="admin-panel-head">
            <div>
              <h2 id="recent-articles-heading">Recently updated articles</h2>
              <p>Latest five article records.</p>
            </div>
            <Link href="/admin/articles" className="btn btn-secondary btn-sm">
              Manage
            </Link>
          </div>
          <div className="admin-panel-body admin-panel-body-flush">
            {recentArticles.length > 0 ? (
              <div className="admin-table-wrap">
                <table className="admin-table" style={{ minWidth: 480 }}>
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th>Status</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentArticles.map((article) => (
                      <tr key={article.id}>
                        <td>
                          <div className="admin-table-title">
                            <Link href={`/admin/articles/${article.id}/edit`}>
                              {article.title}
                            </Link>
                          </div>
                          <p className="admin-table-sub">
                            {article.category_name ?? "Uncategorised"}
                          </p>
                        </td>
                        <td>
                          <span className={`status-badge status-${article.status}`}>
                            {article.status}
                          </span>
                        </td>
                        <td>{formatDate(article.updated_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty">
                <strong>No articles yet</strong>
                <p>Write your first career article from the article editor.</p>
                <Link
                  href="/admin/articles/new"
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 14 }}
                >
                  <FileIcon size={14} /> Create Article
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="admin-panel" aria-labelledby="recent-user-details-heading">
        <div className="admin-panel-head">
          <div>
            <h2 id="recent-user-details-heading">Recent user details</h2>
            <p>Latest five submissions from the public website.</p>
          </div>
          <Link href="/admin/user-details" className="btn btn-secondary btn-sm">
            View all
          </Link>
        </div>
        <div className="admin-panel-body admin-panel-body-flush">
          {recentUserDetails.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table" style={{ minWidth: 560 }}>
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Type</th>
                    <th>Resume</th>
                    <th>Status</th>
                    <th>Received</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {recentUserDetails.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <div className="admin-table-title">
                          <Link href={`/admin/user-details/${record.id}`}>{record.name}</Link>
                        </div>
                        <p className="admin-table-sub">{record.email}</p>
                      </td>
                      <td>{userDetailKindLabel(record.kind)}</td>
                      <td>{record.has_resume ? "Attached" : "—"}</td>
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
            <div className="admin-empty">
              <strong>No user submissions yet</strong>
              <p>
                Registrations from the job-alerts popup and resumes from job pages will appear
                here.
              </p>
              <Link
                href="/job-alerts"
                className="btn btn-primary btn-sm"
                style={{ marginTop: 14 }}
              >
                Open public form
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="admin-panel" aria-labelledby="publishing-notes">
        <div className="admin-panel-head">
          <div>
            <h2 id="publishing-notes">Publishing status</h2>
            <p>How public visibility works.</p>
          </div>
        </div>
        <div className="admin-panel-body">
          <p className="admin-hint">
            Job drafts and articles in draft or archive status are never exposed by public
            queries. Scheduled articles become visible when their scheduled time passes.
            Expired jobs are automatically excluded from the public job directory. The current
            server time in IST is{" "}
            <strong>{formatDateTime(new Date().toISOString())}</strong>.
          </p>
        </div>
      </section>
    </>
  );
}
