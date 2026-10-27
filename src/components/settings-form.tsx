"use client";

import { useActionState } from "react";
import { updateSettingsAction, type SettingsState } from "@/actions/settings";
import type { SiteSettings } from "@/lib/settings";

const INITIAL: SettingsState = { ok: false, errors: {} };

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="field-error">{message}</span>;
}

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, formAction, pending] = useActionState(updateSettingsAction, INITIAL);
  const errors = state.errors ?? {};

  return (
    <form className="admin-form" action={formAction}>
      {state.message ? (
        <p
          className={state.ok ? "notice notice-success" : "admin-form-error-summary"}
          role={state.ok ? "status" : "alert"}
          style={{ marginBottom: 0 }}
        >
          {state.message}
        </p>
      ) : null}

      <section className="admin-panel" aria-labelledby="registration-settings-heading">
        <div className="admin-panel-head">
          <div>
            <h2 id="registration-settings-heading">Job alerts registration</h2>
            <p>Built-in registration form, automatic timing and the privacy notice.</p>
          </div>
        </div>
        <div className="admin-panel-body">
          <div className="admin-form-grid">
            <div className="field full">
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  name="registration_popup_enabled"
                  defaultChecked={settings.registration_popup_enabled === "1"}
                />
                <span>
                  Enable the registration popup
                  <small>
                    When enabled, the popup opens automatically once per browsing session. The
                    header and footer buttons always reopen it. Submissions appear under User
                    Details in this dashboard.
                  </small>
                </span>
              </label>
            </div>

            <div className="field">
              <label className="label" htmlFor="popup-delay">
                Automatic delay (seconds)
              </label>
              <input
                className="input"
                id="popup-delay"
                name="registration_popup_delay_seconds"
                type="number"
                min={8}
                max={30}
                step={1}
                defaultValue={settings.registration_popup_delay_seconds}
              />
              <span className="field-hint">The default is 9 seconds. Minimum 8 seconds.</span>
              <ErrorText message={errors.registration_popup_delay_seconds} />
            </div>

            <div className="field">
              <label className="label" htmlFor="popup-title">
                Popup title
              </label>
              <input
                className="input"
                id="popup-title"
                name="registration_popup_title"
                defaultValue={settings.registration_popup_title}
                maxLength={120}
              />
              <ErrorText message={errors.registration_popup_title} />
            </div>

            <div className="field full">
              <label className="label" htmlFor="privacy-note">
                Popup privacy notice
              </label>
              <textarea
                className="textarea"
                id="privacy-note"
                name="registration_privacy_note"
                defaultValue={settings.registration_privacy_note}
                rows={4}
                maxLength={600}
                placeholder="Explain why the information is collected and who reviews it. A clear default is shown if left blank."
              />
              <span className="field-hint">
                Displayed at the bottom of the popup next to a link to the Privacy Policy.
              </span>
              <ErrorText message={errors.registration_privacy_note} />
            </div>
          </div>
        </div>
      </section>

      <section className="admin-panel" aria-labelledby="homepage-settings-heading">
        <div className="admin-panel-head">
          <div>
            <h2 id="homepage-settings-heading">Homepage visibility</h2>
            <p>Show or hide entire public homepage sections without deleting content.</p>
          </div>
        </div>
        <div className="admin-panel-body">
          <div className="admin-form-grid">
            <label className="admin-checkbox">
              <input
                type="checkbox"
                name="homepage_show_jobs"
                defaultChecked={settings.homepage_show_jobs === "1"}
              />
              <span>
                Show Latest Job Alerts
                <small>The job directory at /jobs remains available regardless.</small>
              </span>
            </label>

            <label className="admin-checkbox">
              <input
                type="checkbox"
                name="homepage_show_articles"
                defaultChecked={settings.homepage_show_articles === "1"}
              />
              <span>
                Show Latest Pharma Career Articles
                <small>The article directory at /articles remains available.</small>
              </span>
            </label>

            <div className="field">
              <label className="label" htmlFor="contact-email">
                Public contact email <span className="optional">(optional)</span>
              </label>
              <input
                className="input"
                id="contact-email"
                name="contact_email"
                type="email"
                defaultValue={settings.contact_email}
                maxLength={254}
                placeholder="Only enter an address you control"
              />
              <span className="field-hint">
                Stored for the owner&apos;s reference. Do not enter an invented address.
              </span>
              <ErrorText message={errors.contact_email} />
            </div>
          </div>
        </div>
      </section>

      <div className="admin-sticky-actions">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save website settings"}
        </button>
        <p className="admin-hint" style={{ marginLeft: "auto" }}>
          Changes apply without redeploying the application.
        </p>
      </div>
    </form>
  );
}
