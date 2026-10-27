"use client";

import { useActionState, useRef } from "react";
import { reportJobAction } from "@/actions/public";
import {
  AlertIcon,
  CheckIcon,
  CloseIcon,
  FlagIcon,
} from "@/components/icons";
import { REPORT_REASONS } from "@/lib/constants";
import type { ReportState } from "@/lib/forms";

const initialState: ReportState = { ok: false, errors: {} };

export function ReportDialog({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const [state, formAction, pending] = useActionState(reportJobAction, initialState);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button type="button" className="report-trigger" onClick={open}>
        <FlagIcon size={14} />
        Report this listing
      </button>

      <dialog
        ref={dialogRef}
        className="dialog"
        aria-labelledby="report-dialog-title"
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        <div className="dialog-header">
          <div>
            <h2 id="report-dialog-title">Report this listing</h2>
            <p className="dialog-subtitle">{jobTitle}</p>
          </div>
          <button type="button" className="icon-button" onClick={close}>
            <CloseIcon size={18} />
            <span className="sr-only">Close dialog</span>
          </button>
        </div>

        {state.ok ? (
          <div className="dialog-body">
            <div className="notice notice-success" role="status">
              <CheckIcon size={18} />
              <div>{state.message}</div>
            </div>
            <button type="button" className="btn btn-primary" onClick={close}>
              Close
            </button>
          </div>
        ) : (
          <form action={formAction} className="dialog-body">
            <input type="hidden" name="job_id" value={jobId} />

            {state.message ? (
              <div className="notice notice-error" role="alert">
                <AlertIcon size={18} />
                <div>{state.message}</div>
              </div>
            ) : null}

            <div className="field">
              <label className="label" htmlFor="report-reason">
                What is wrong with this listing?
              </label>
              <select
                className="select"
                id="report-reason"
                name="reason"
                required
                defaultValue={REPORT_REASONS[0]}
                aria-invalid={state.errors.reason ? true : undefined}
                aria-describedby={state.errors.reason ? "report-reason-error" : undefined}
              >
                {REPORT_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
              {state.errors.reason ? (
                <p className="field-error" id="report-reason-error">
                  {state.errors.reason}
                </p>
              ) : null}
            </div>

            <div className="field">
              <label className="label" htmlFor="report-details">
                Details <span className="optional">(optional)</span>
              </label>
              <textarea
                className="textarea"
                id="report-details"
                name="details"
                rows={4}
                maxLength={2000}
                placeholder="Tell us what you noticed."
                aria-invalid={state.errors.details ? true : undefined}
                aria-describedby={state.errors.details ? "report-details-error" : undefined}
              />
              {state.errors.details ? (
                <p className="field-error" id="report-details-error">
                  {state.errors.details}
                </p>
              ) : null}
            </div>

            <div className="field">
              <label className="label" htmlFor="report-email">
                Your email <span className="optional">(optional)</span>
              </label>
              <input
                className="input"
                id="report-email"
                name="reporter_email"
                type="email"
                maxLength={254}
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={state.errors.reporter_email ? true : undefined}
                aria-describedby={
                  state.errors.reporter_email ? "report-email-error" : undefined
                }
              />
              {state.errors.reporter_email ? (
                <p className="field-error" id="report-email-error">
                  {state.errors.reporter_email}
                </p>
              ) : null}
              <p className="field-hint">
                Only used if the site owner needs to follow up about this report.
              </p>
            </div>

            <div className="hp-field" aria-hidden="true">
              <label htmlFor="report-website">Website</label>
              <input id="report-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={close}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={pending}>
                {pending ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
