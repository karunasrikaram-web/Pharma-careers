import type { Metadata } from "next";
import { PasswordForm } from "@/components/password-form";
import { SettingsForm } from "@/components/settings-form";
import {
  getRegistrationConfig,
  getSettings,
  isEnabled,
} from "@/lib/settings";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { formatDateTime } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await getSession();
  const settings = getSettings();
  const registration = getRegistrationConfig();

  const admins = getDb()
    .prepare("SELECT id, email, name, is_active, created_at, last_login_at FROM admins ORDER BY created_at")
    .all() as Array<{
    id: string;
    email: string;
    name: string;
    is_active: number;
    created_at: string;
    last_login_at: string | null;
  }>;

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>Settings</h1>
          <p>Manage the registration popup, homepage sections and administrator account.</p>
        </div>
        <div className="admin-actions">
          <span className="status-badge status-published">Administrator access</span>
        </div>
      </div>

      <div className="admin-two-col">
        <SettingsForm settings={settings} />

        <div className="admin-side-stack">
          <section className="admin-panel" aria-labelledby="account-heading">
            <div className="admin-panel-head">
              <div>
                <h2 id="account-heading">Your account</h2>
                <p>Signed-in administrator identity.</p>
              </div>
            </div>
            <div className="admin-panel-body">
              <dl className="overview-list" style={{ marginBottom: 0 }}>
                <div>
                  <dt>Name</dt>
                  <dd>{session?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd style={{ wordBreak: "break-all" }}>{session?.email ?? "—"}</dd>
                </div>
                <div>
                  <dt>Last sign-in</dt>
                  <dd>{session?.last_login_at ? formatDateTime(session.last_login_at) : "—"}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="admin-panel" aria-labelledby="popup-summary-heading">
            <div className="admin-panel-head">
              <div>
                <h2 id="popup-summary-heading">Popup summary</h2>
                <p>Current effective configuration.</p>
              </div>
            </div>
            <div className="admin-panel-body">
              <dl className="overview-list" style={{ marginBottom: 0 }}>
                <div>
                  <dt>Enabled</dt>
                  <dd>{isEnabled(settings.registration_popup_enabled) ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt>Delay</dt>
                  <dd>{registration.delaySeconds}s</dd>
                </div>
                <div>
                  <dt>Submissions go to</dt>
                  <dd>User Details</dd>
                </div>
                <div>
                  <dt>Popup shown</dt>
                  <dd>Once per session</dd>
                </div>
              </dl>
              <p className="admin-hint" style={{ marginTop: 12 }}>
                Dismissal is stored in the visitor&apos;s browser session, not in the database.
              </p>
            </div>
          </section>

          <section className="admin-panel" aria-labelledby="password-heading">
            <div className="admin-panel-head">
              <div>
                <h2 id="password-heading">Change password</h2>
                <p>Other active sessions are signed out after a change.</p>
              </div>
            </div>
            <div className="admin-panel-body">
              <PasswordForm />
              <p className="admin-hint" style={{ marginTop: 14 }}>
                Email-based password reset is not configured because no transactional email
                provider is connected. Use the reset script on the server or change the password
                here.
              </p>
            </div>
          </section>
        </div>
      </div>

      <section className="admin-panel" aria-labelledby="admins-heading">
        <div className="admin-panel-head">
          <div>
            <h2 id="admins-heading">Administrator accounts</h2>
            <p>
              Provisioned by the site owner. Public registration never creates an administrator.
            </p>
          </div>
        </div>
        <div className="admin-panel-body admin-panel-body-flush">
          <div className="admin-table-wrap">
            <table className="admin-table" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Last sign-in</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td>{admin.name}</td>
                    <td style={{ wordBreak: "break-all" }}>{admin.email}</td>
                    <td>
                      <span
                        className={`status-badge ${admin.is_active ? "status-published" : "status-archived"}`}
                      >
                        {admin.is_active ? "active" : "disabled"}
                      </span>
                    </td>
                    <td>{formatDateTime(admin.created_at)}</td>
                    <td>{admin.last_login_at ? formatDateTime(admin.last_login_at) : "Never"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="admin-panel" aria-labelledby="security-heading">
        <div className="admin-panel-head">
          <div>
            <h2 id="security-heading">Security and environment</h2>
            <p>Secrets are never displayed in this dashboard.</p>
          </div>
        </div>
        <div className="admin-panel-body">
          <p className="admin-hint">
            Administrator routes are protected by server-side session checks. Every create,
            update, publish and delete action calls the same server-side authorization guard.
            Public queries only select published, non-expired jobs and published articles.
            Database credentials and the application secret remain server-side environment
            variables. The application uses SQLite, so use a host with a persistent disk.
          </p>
        </div>
      </section>
    </>
  );
}
