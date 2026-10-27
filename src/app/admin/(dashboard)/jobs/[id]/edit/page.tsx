import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminFlash } from "@/components/admin-flash";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { JobForm } from "@/components/job-form";
import { ArrowLeftIcon } from "@/components/icons";
import {
  deleteJobAction,
  setJobStatusAction,
  toggleFeaturedAction,
} from "@/actions/jobs";
import { getJobById } from "@/lib/jobs";
import { isExpired } from "@/lib/dates";
import { jobToFormValues } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit job" };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function EditJobPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const query = await searchParams;
  const job = await getJobById(id);
  if (!job) notFound();

  const expired = job.status === "published" && isExpired(job.application_deadline);
  const publicHref = expired ? null : `/jobs/${job.slug}`;

  return (
    <>
      <div className="admin-page-head">
        <div>
          <Link href="/admin/jobs" className="link-arrow" style={{ marginBottom: 8 }}>
            <ArrowLeftIcon size={14} /> Back to jobs
          </Link>
          <h1>Edit Job</h1>
          <p>Update details, publishing status and application information.</p>
        </div>
        <div className="admin-actions">
          <span className={`status-badge status-${expired ? "expired" : job.status}`}>
            {expired ? "expired" : job.status}
          </span>
          {publicHref ? (
            <Link
              href={publicHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              View public page
            </Link>
          ) : null}
        </div>
      </div>

      <AdminFlash
        saved={first(query.saved) === "1"}
        error={first(query.error) || undefined}
      />

      <section className="admin-panel" aria-labelledby="job-controls-heading">
        <div className="admin-panel-head">
          <div>
            <h2 id="job-controls-heading">Publishing controls</h2>
            <p>Quick actions apply immediately to the public site.</p>
          </div>
        </div>
        <div className="admin-panel-body">
          <div className="admin-actions">
            {job.status !== "published" ? (
              <form action={setJobStatusAction}>
                <input type="hidden" name="id" value={job.id} />
                <input type="hidden" name="status" value="published" />
                <button className="btn btn-primary btn-sm" type="submit">
                  Publish job
                </button>
              </form>
            ) : (
              <form action={setJobStatusAction}>
                <input type="hidden" name="id" value={job.id} />
                <input type="hidden" name="status" value="draft" />
                <button className="btn btn-secondary btn-sm" type="submit">
                  Unpublish to draft
                </button>
              </form>
            )}

            {job.status !== "archived" ? (
              <form action={setJobStatusAction}>
                <input type="hidden" name="id" value={job.id} />
                <input type="hidden" name="status" value="archived" />
                <button className="btn btn-secondary btn-sm" type="submit">
                  Archive
                </button>
              </form>
            ) : null}

            <form action={toggleFeaturedAction}>
              <input type="hidden" name="id" value={job.id} />
              <button className="btn btn-secondary btn-sm" type="submit">
                {job.is_featured ? "Remove featured" : "Mark featured"}
              </button>
            </form>

            <form action={deleteJobAction} style={{ marginLeft: "auto" }}>
              <input type="hidden" name="id" value={job.id} />
              <ConfirmSubmitButton
                message={`Delete “${job.title}” permanently? This cannot be undone.`}
              >
                Delete job
              </ConfirmSubmitButton>
            </form>
          </div>
          {expired ? (
            <p className="notice notice-info" style={{ marginTop: 16, marginBottom: 0 }}>
              This job is published but its application deadline has passed, so it is hidden
              from public listings. Update the deadline or unpublish it.
            </p>
          ) : null}
        </div>
      </section>

      <JobForm initialValues={jobToFormValues(job)} />
    </>
  );
}
