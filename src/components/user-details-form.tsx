"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { saveUserDetailsAction } from "@/actions/user-details";
import { CheckIcon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { EXPERIENCE_LEVELS, QUALIFICATIONS } from "@/lib/constants";
import type { UserDetailsFormState } from "@/lib/forms";

const INITIAL: UserDetailsFormState = {
  ok: false,
  errors: {},
  values: {
    name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    qualification: "",
    experience: "",
    preferred_departments: "",
    message: "",
    consent: false,
  },
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="field-error">{message}</span>;
}

export function UserDetailsForm({
  kind = "job_alert",
  jobId,
  jobTitle,
  variant = "page",
  submitLabel,
  onDone,
}: {
  kind?: "job_alert" | "job_application";
  jobId?: string;
  jobTitle?: string;
  variant?: "page" | "popup" | "job";
  submitLabel?: string;
  onDone?: () => void;
}) {
  const [state, formAction] = useActionState(saveUserDetailsAction, INITIAL);
  const uid = useId();
  const errors = state.errors ?? {};
  const values = state.values;

  const id = (field: string) => `${uid}-${field}`;
  const isApplication = kind === "job_application";

  if (state.ok) {
    return (
      <div className="user-details-success" role="status">
        <span className="success-icon" aria-hidden="true">
          <CheckIcon size={22} />
        </span>
        <h3>Details received</h3>
        <p>{state.message}</p>
        <div className="empty-actions">
          <Link className="btn btn-secondary btn-sm" href="/jobs">
            Browse jobs
          </Link>
          {onDone ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>
              Close
            </button>
          ) : (
            <Link className="btn btn-ghost btn-sm" href="/job-alerts">
              Register for job alerts
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      className={`user-details-form user-details-form-${variant}`}
      action={formAction}
      noValidate
    >
      <input type="hidden" name="kind" value={kind} />
      {isApplication && jobId ? <input type="hidden" name="job_id" value={jobId} /> : null}

      <div className="hp-field" aria-hidden="true">
        <label htmlFor={id("website")}>Website</label>
        <input id={id("website")} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state.message ? (
        <p className="notice notice-error" role="alert">
          {state.message}
        </p>
      ) : null}

      {isApplication && jobTitle ? (
        <p className="form-note">
          Applying for <strong>{jobTitle}</strong>. Your details are saved to this website for
          the site owner to review.
        </p>
      ) : null}

      <div className="form-row">
        <div className="field">
          <label className="label" htmlFor={id("name")}>
            Full name
          </label>
          <input
            className="input"
            id={id("name")}
            name="name"
            type="text"
            autoComplete="name"
            maxLength={100}
            defaultValue={values.name}
            required
            aria-invalid={errors.name ? true : undefined}
          />
          <FieldError message={errors.name} />
        </div>

        <div className="field">
          <label className="label" htmlFor={id("email")}>
            Email address
          </label>
          <input
            className="input"
            id={id("email")}
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            defaultValue={values.email}
            required
            aria-invalid={errors.email ? true : undefined}
          />
          <FieldError message={errors.email} />
        </div>

        <div className="field">
          <label className="label" htmlFor={id("phone")}>
            Phone number
          </label>
          <input
            className="input"
            id={id("phone")}
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={25}
            defaultValue={values.phone}
            required
            aria-invalid={errors.phone ? true : undefined}
          />
          <FieldError message={errors.phone} />
        </div>

        <div className="field">
          <label className="label" htmlFor={id("city")}>
            City
          </label>
          <input
            className="input"
            id={id("city")}
            name="city"
            type="text"
            autoComplete="address-level2"
            maxLength={80}
            defaultValue={values.city}
            required
            aria-invalid={errors.city ? true : undefined}
          />
          <FieldError message={errors.city} />
        </div>

        <div className="field">
          <label className="label" htmlFor={id("state")}>
            State
          </label>
          <input
            className="input"
            id={id("state")}
            name="state"
            type="text"
            autoComplete="address-level1"
            maxLength={80}
            defaultValue={values.state}
            required
            aria-invalid={errors.state ? true : undefined}
          />
          <FieldError message={errors.state} />
        </div>

        <div className="field">
          <label className="label" htmlFor={id("qualification")}>
            Highest qualification
          </label>
          <select
            className="select"
            id={id("qualification")}
            name="qualification"
            defaultValue={values.qualification}
            required
            aria-invalid={errors.qualification ? true : undefined}
          >
            <option value="">Select qualification</option>
            {QUALIFICATIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <FieldError message={errors.qualification} />
        </div>

        <div className="field">
          <label className="label" htmlFor={id("experience")}>
            Experience
          </label>
          <select
            className="select"
            id={id("experience")}
            name="experience"
            defaultValue={values.experience}
            required
            aria-invalid={errors.experience ? true : undefined}
          >
            <option value="">Select experience</option>
            {EXPERIENCE_LEVELS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <FieldError message={errors.experience} />
        </div>

        <div className="field">
          <label className="label" htmlFor={id("departments")}>
            Preferred departments <span className="optional">(optional)</span>
          </label>
          <input
            className="input"
            id={id("departments")}
            name="preferred_departments"
            type="text"
            maxLength={120}
            defaultValue={values.preferred_departments}
            placeholder="e.g. Quality Assurance, Production"
          />
          <FieldError message={errors.preferred_departments} />
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor={id("resume")}>
          Attach resume <span className="optional">(optional)</span>
        </label>
        <input
          className="file-input"
          id={id("resume")}
          name="resume"
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          aria-describedby={id("resume-hint")}
          aria-invalid={errors.resume ? true : undefined}
        />
        <span className="field-hint" id={id("resume-hint")}>
          PDF, DOC or DOCX · up to 5 MB. Stored privately and visible only to the site owner.
        </span>
        <FieldError message={errors.resume} />
      </div>

      <div className="field">
        <label className="label" htmlFor={id("message")}>
          {isApplication ? "Cover note" : "Anything you want us to know?"}{" "}
          <span className="optional">(optional)</span>
        </label>
        <textarea
          className="textarea"
          id={id("message")}
          name="message"
          rows={variant === "popup" ? 3 : 4}
          maxLength={2000}
          defaultValue={values.message}
          placeholder={
            isApplication
              ? "Highlight relevant experience, availability or notice period."
              : "Preferred locations, departments or roles."
          }
        />
        <FieldError message={errors.message} />
      </div>

      <div className="field">
        <label className="consent-checkbox" htmlFor={id("consent")}>
          <input
            id={id("consent")}
            name="consent"
            type="checkbox"
            defaultChecked={values.consent}
            required
            aria-invalid={errors.consent ? true : undefined}
          />
          <span>
            I agree that my details and resume may be stored and reviewed by the site owner.
            <small>
              See the{" "}
              <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </Link>
              . You can request removal through the contact form.
            </small>
          </span>
        </label>
        <FieldError message={errors.consent} />
      </div>

      <div className="form-actions">
        <SubmitButton
          label={submitLabel ?? (isApplication ? "Submit application details" : "Register for job alerts")}
          pendingLabel="Submitting…"
        />
        <p className="form-note">
          {isApplication
            ? "This form saves your details here. It does not email the employer."
            : "Your details are stored privately in this website’s database."}
        </p>
      </div>
    </form>
  );
}
