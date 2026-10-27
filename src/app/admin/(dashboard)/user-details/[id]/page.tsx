import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminFlash } from "@/components/admin-flash";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  deleteUserDetailAction,
  updateUserDetailAction,
} from "@/actions/user-details";
import { USER_DETAIL_STATUSES } from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";
import {
  formatBytes,
  getUserDetailById,
  userDetailKindLabel,
} from "@/lib/user-details";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "User detail" };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const query = await searchParams;
  const record = getUserDetailById(id);
  if (!record) notFound();

  const isApplication = record.kind === "job_application";

  return (
    <>
      <div className="admin-page-head">
        <div>
          <p className="admin-breadcrumb">
            <Link href="/admin/user-details">User Details</Link> / {record.name}
          </p>
          <h1>{record.name}</h1>
          <p>
            {userDetailKindLabel(record.kind)}
            {isApplication && record.job_title ? ` · ${record.job_title}` : ""} · received{" "}
            {formatDateTime(record.created_at)}
          </p>
        </div>
        <div className="admin-actions">
          <span className={`status-badge status-${record.status}`}>{record.status}</span>
          <Link href="/admin/user-details" className="btn btn-secondary btn-sm">
            Back to list
          </Link>
        </div>
      </div>

      <AdminFlash saved={first(query.saved) === "1"} error={first(query.error) || undefined} />

      <div className="admin-two-col">
        <div className="admin-side-stack">
          <section className="admin-panel" aria-labelledby="contact-heading">
            <div className="admin-panel-head">
              <div>
                <h2 id="contact-heading">Contact details</h2>
                <p>Submitted through the public website.</p>
              </div>
            </div>
            <div className="admin-panel-body">
              <dl className="overview-list">
                <div>
                  <dt>Email</dt>
                  <dd>
                    <a className="text-link" href={`mailto:${record.email}`}>
                      {record.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>
                    <a className="text-link" href={`tel:${record.phone}`}>
                      {record.phone}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>
                    {[record.city, record.state].filter(Boolean).join(", ") || "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt>Highest qualification</dt>
                  <dd>{record.qualification ?? "Not provided"}</dd>
                </div>
                <div>
                  <dt>Experience</dt>
                  <dd>{record.experience ?? "Not provided"}</dd>
                </div>
                <div>
                  <dt>Preferred departments</dt>
                  <dd>{record.preferred_departments ?? "Not provided"}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="admin-panel" aria-labelledby="message-heading">
            <div className="admin-panel-head">
              <div>
                <h2 id="message-heading">{isApplication ? "Cover note" : "Message"}</h2>
                <p>Written by the applicant.</p>
              </div>
            </div>
            <div className="admin-panel-body">
              {record.message ? (
                <p className="admin-detail-message">{record.message}</p>
              ) : (
                <p className="admin-hint">No message was included.</p>
              )}
            </div>
          </section>

          <section className="admin-panel" aria-labelledby="record-heading">
            <div className="admin-panel-head">
              <div>
                <h2 id="record-heading">Submission record</h2>
                <p>Internal metadata for this submission.</p>
              </div>
            </div>
            <div className="admin-panel-body">
              <dl className="overview-list" style={{ marginBottom: 0 }}>
                <div>
                  <dt>Type</dt>
                  <dd>{userDetailKindLabel(record.kind)}</dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>
                    {isApplication ? (
                      record.job_id ? (
                        <Link className="text-link" href={`/admin/jobs/${record.job_id}/edit`}>
                          {record.job_title ?? "Job record"}
                        </Link>
                      ) : (
                        record.job_title ?? "Job record no longer exists"
                      )
                    ) : (
                      "Job alerts registration"
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Received</dt>
                  <dd>{formatDateTime(record.created_at)}</dd>
                </div>
                <div>
                  <dt>Last updated</dt>
                  <dd>{formatDateTime(record.updated_at)}</dd>
                </div>
              </dl>
            </div>
          </section>
        </div>

        <div className="admin-side-stack">
          <section className="admin-panel" aria-labelledby="resume-heading">
            <div className="admin-panel-head">
              <div>
                <h2 id="resume-heading">Resume</h2>
                <p>Private file access for signed-in administrators.</p>
              </div>
            </div>
            <div className="admin-panel-body">
              {record.has_resume ? (
                <>
                  <p style={{ fontWeight: 650, wordBreak: "break-all" }}>
                    {record.resume_name}
                  </p>
                  <p className="admin-hint" style={{ marginTop: 4 }}>
                    {formatBytes(record.resume_size)} · {record.resume_mime}
                  </p>
                  <a
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 12 }}
                    href={`/admin/user-details/${record.id}/resume`}
                    rel="noopener"
                  >
                    Download resume
                  </a>
                </>
              ) : (
                <p className="admin-hint">
                  No resume was attached. Job pages offer an optional resume upload with each
                  application.
                </p>
              )}
            </div>
          </section>

          <section className="admin-panel" aria-labelledby="review-heading">
            <div className="admin-panel-head">
              <div>
                <h2 id="review-heading">Review</h2>
                <p>Update the status and keep an internal note.</p>
              </div>
            </div>
            <div className="admin-panel-body">
              <form className="admin-form" action={updateUserDetailAction}>
                <input type="hidden" name="id" value={record.id} />
                <input
                  type="hidden"
                  name="return_to"
                  value={`/admin/user-details/${record.id}`}
                />
                <div className="field">
                  <label className="label" htmlFor="detail-status">
                    Status
                  </label>
                  <select
                    className="select"
                    id="detail-status"
                    name="status"
                    defaultValue={record.status}
                  >
                    {USER_DETAIL_STATUSES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="detail-note">
                    Internal note <span className="optional">(optional)</span>
                  </label>
                  <textarea
                    className="textarea"
                    id="detail-note"
                    name="admin_note"
                    rows={5}
                    maxLength={2000}
                    defaultValue={record.admin_note ?? ""}
                    placeholder="Notes are visible only to administrators."
                  />
                </div>
                <button className="btn btn-primary btn-sm" type="submit">
                  Save changes
                </button>
              </form>
            </div>
          </section>

          <section className="admin-panel admin-panel-danger" aria-labelledby="delete-heading">
            <div className="admin-panel-head">
              <div>
                <h2 id="delete-heading">Delete submission</h2>
                <p>Permanently removes the record and any attached resume.</p>
              </div>
            </div>
            <div className="admin-panel-body">
              <form action={deleteUserDetailAction}>
                <input type="hidden" name="id" value={record.id} />
                <ConfirmSubmitButton message="Delete this submission and its resume? This cannot be undone.">
                  Delete submission
                </ConfirmSubmitButton>
              </form>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
