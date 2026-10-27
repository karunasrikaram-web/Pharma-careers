import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmpty, AdminFlash } from "@/components/admin-flash";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { deleteMessageAction, updateMessageStatusAction } from "@/actions/admin";
import { getMessageCounts, listContactMessages } from "@/lib/admin-data";
import { formatDateTime } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Messages" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUSES = ["new", "read", "archived"] as const;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const requestedStatus = first(params.status).trim();
  const status = (STATUSES as readonly string[]).includes(requestedStatus)
    ? requestedStatus
    : "";
  const messages = listContactMessages(status || undefined);
  const counts = getMessageCounts();

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>Messages</h1>
          <p>Contact-form messages sent from the public website.</p>
        </div>
        <div className="admin-actions">
          <Link href="/contact" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            View contact page
          </Link>
        </div>
      </div>

      <AdminFlash
        updated={first(params.updated) === "1"}
        deleted={first(params.deleted) === "1"}
        error={first(params.error) || undefined}
        successMessage={
          first(params.deleted) === "1"
            ? "The message was deleted."
            : "The message was updated."
        }
      />

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-card-label">Total messages</p>
          <p className="stat-card-value">{counts.total}</p>
          <p className="stat-card-note">Stored in this website&apos;s database</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">New</p>
          <p className="stat-card-value">{counts.unread}</p>
          <p className="stat-card-note">Not reviewed yet</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Read</p>
          <p className="stat-card-value">{counts.read}</p>
          <p className="stat-card-note">Reviewed and kept</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Archived</p>
          <p className="stat-card-value">{counts.archived}</p>
          <p className="stat-card-note">Hidden from the default view</p>
        </div>
      </div>

      <section className="admin-panel" aria-labelledby="messages-table-heading">
        <div className="admin-panel-head">
          <div>
            <h2 id="messages-table-heading">
              {status ? `${status[0].toUpperCase()}${status.slice(1)} messages` : "All messages"}
            </h2>
            <p>
              {messages.length} message{messages.length === 1 ? "" : "s"} shown.
            </p>
          </div>
        </div>

        <form className="admin-filter-bar" action="/admin/messages" method="get">
          <label className="sr-only" htmlFor="admin-message-status">
            Filter by status
          </label>
          <select className="select" id="admin-message-status" name="status" defaultValue={status}>
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
            <Link href="/admin/messages" className="btn btn-ghost btn-sm">
              Clear
            </Link>
          ) : null}
        </form>

        {messages.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>From</th>
                  <th>Subject and message</th>
                  <th>Status</th>
                  <th>Received</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((message) => (
                  <tr key={message.id}>
                    <td>
                      <div className="admin-table-title">{message.name}</div>
                      <p className="admin-table-sub">
                        <a className="text-link" href={`mailto:${message.email}`}>
                          {message.email}
                        </a>
                      </p>
                    </td>
                    <td>
                      <details className="admin-message">
                        <summary>{message.subject}</summary>
                        <p className="admin-message-body">{message.message}</p>
                      </details>
                    </td>
                    <td>
                      <span className={`status-badge status-${message.status}`}>
                        {message.status}
                      </span>
                    </td>
                    <td>{formatDateTime(message.created_at)}</td>
                    <td>
                      <div className="admin-table-actions">
                        {message.status === "new" ? (
                          <form action={updateMessageStatusAction}>
                            <input type="hidden" name="id" value={message.id} />
                            <input type="hidden" name="status" value="read" />
                            <button className="btn btn-secondary btn-sm" type="submit">
                              Mark read
                            </button>
                          </form>
                        ) : null}
                        {message.status === "read" ? (
                          <form action={updateMessageStatusAction}>
                            <input type="hidden" name="id" value={message.id} />
                            <input type="hidden" name="status" value="new" />
                            <button className="btn btn-ghost btn-sm" type="submit">
                              Mark unread
                            </button>
                          </form>
                        ) : null}
                        {message.status !== "archived" ? (
                          <form action={updateMessageStatusAction}>
                            <input type="hidden" name="id" value={message.id} />
                            <input type="hidden" name="status" value="archived" />
                            <button className="btn btn-ghost btn-sm" type="submit">
                              Archive
                            </button>
                          </form>
                        ) : (
                          <form action={updateMessageStatusAction}>
                            <input type="hidden" name="id" value={message.id} />
                            <input type="hidden" name="status" value="new" />
                            <button className="btn btn-ghost btn-sm" type="submit">
                              Restore
                            </button>
                          </form>
                        )}
                        <form action={deleteMessageAction}>
                          <input type="hidden" name="id" value={message.id} />
                          <ConfirmSubmitButton message="Delete this message permanently? This cannot be undone.">
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
            title={status ? `No ${status} messages` : "No messages yet"}
            description={
              status
                ? "Try a different status filter."
                : "Messages sent through the public contact form will appear here."
            }
            actionHref={status ? "/admin/messages" : "/contact"}
            actionLabel={status ? "Clear filter" : "Open contact form"}
          />
        )}
      </section>
    </>
  );
}
