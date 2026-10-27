"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CloseIcon, MailIcon } from "@/components/icons";
import { UserDetailsForm } from "@/components/user-details-form";

const DISMISS_KEY = "pc_job_alerts_dismissed";
const SHOWN_KEY = "pc_job_alerts_shown";

interface JobAlertsPopupProps {
  enabled: boolean;
  delaySeconds: number;
  title: string;
  privacyNote: string;
}

export function JobAlertsPopup({
  enabled,
  delaySeconds,
  title,
  privacyNote,
}: JobAlertsPopupProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocus = useRef<Element | null>(null);

  const dismiss = useCallback(() => {
    setOpen(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Private browsing can block sessionStorage; closing still works.
    }
  }, []);

  const openPopup = useCallback(() => {
    setOpen(true);
    try {
      sessionStorage.setItem(SHOWN_KEY, "1");
    } catch {
      // Ignore storage failures.
    }
  }, []);

  // Automatic, once-per-session invitation. Manual buttons always reopen it.
  useEffect(() => {
    if (!enabled) return;
    // The dedicated job-alerts page already shows the same form inline.
    if (window.location.pathname === "/job-alerts") return;
    let dismissed = false;
    let shown = false;
    try {
      dismissed = sessionStorage.getItem(DISMISS_KEY) === "1";
      shown = sessionStorage.getItem(SHOWN_KEY) === "1";
    } catch {
      // Treat storage failures as "not dismissed".
    }
    if (dismissed || shown) return;

    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SHOWN_KEY, "1");
      } catch {
        // Ignore.
      }
      setOpen(true);
    }, Math.max(8, delaySeconds) * 1000);

    return () => window.clearTimeout(timer);
  }, [delaySeconds, enabled]);

  // Manual trigger from the header, footer and floating button.
  useEffect(() => {
    const handler = () => openPopup();
    window.addEventListener("pharma:open-job-alerts", handler);
    return () => window.removeEventListener("pharma:open-job-alerts", handler);
  }, [openPopup]);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement;
    document.body.classList.add("no-scroll");
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 30);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("no-scroll");
      if (previousFocus.current instanceof HTMLElement) previousFocus.current.focus();
    };
  }, [dismiss, open]);

  if (!open) return null;

  const fallbackPrivacy =
    "Your details are stored privately in this website’s database and are visible only " +
    "to the site owner. They are used to review your interest in pharma jobs and career " +
    "updates. We do not sell your information.";

  return (
    <div
      className="popup-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div
        className="job-alerts-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-alerts-title"
        ref={dialogRef}
      >
        <div className="job-alerts-popup-head">
          <div>
            <p className="job-alerts-kicker">
              <MailIcon size={12} /> Job alerts
            </p>
            <h2 id="job-alerts-title">{title}</h2>
          </div>
          <button
            type="button"
            className="popup-close"
            onClick={dismiss}
            ref={closeButtonRef}
            aria-label="Close job alerts registration"
          >
            <CloseIcon size={19} />
          </button>
        </div>

        <div className="job-alerts-popup-body">
          <UserDetailsForm
            kind="job_alert"
            variant="popup"
            onDone={dismiss}
            submitLabel="Save my details"
          />
        </div>

        <div className="job-alerts-popup-foot">
          <p>
            {privacyNote || fallbackPrivacy}{" "}
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
            .
          </p>
          <button type="button" className="popup-dismiss" onClick={dismiss}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

export function JobAlertsButton({
  label = "Register for Job Alerts",
  className = "job-alerts-trigger",
  icon = true,
}: {
  label?: string;
  className?: string;
  icon?: boolean;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        window.dispatchEvent(new Event("pharma:open-job-alerts"));
      }}
    >
      {icon ? <MailIcon size={14} /> : null}
      <span className="alerts-label">{label}</span>
    </button>
  );
}
