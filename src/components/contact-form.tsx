"use client";

import Link from "next/link";
import { useActionState } from "react";
import { contactAction } from "@/actions/public";
import { CheckIcon, MailIcon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import type { ContactState } from "@/lib/forms";

const initialState: ContactState = {
  ok: false,
  errors: {},
  values: { name: "", email: "", subject: "", message: "" },
};

export function ContactForm() {
  const [state, formAction] = useActionState(contactAction, initialState);

  if (state.ok) {
    return (
      <div className="contact-success" role="status">
        <span className="success-icon" aria-hidden="true">
          <CheckIcon size={22} />
        </span>
        <h2>Message received</h2>
        <p>{state.message}</p>
        <div className="empty-actions">
          <Link className="btn btn-secondary" href="/jobs">
            Browse jobs
          </Link>
          <Link className="btn btn-ghost" href="/contact">
            Send another message
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="contact-form" noValidate>
      {state.message ? (
        <div className="notice notice-error" role="alert">
          {state.message}
        </div>
      ) : null}

      <div className="form-row">
        <div className="field">
          <label className="label" htmlFor="contact-name">
            Your name
          </label>
          <input
            className="input"
            id="contact-name"
            name="name"
            type="text"
            required
            maxLength={100}
            autoComplete="name"
            defaultValue={state.values.name}
            aria-invalid={state.errors.name ? true : undefined}
            aria-describedby={state.errors.name ? "contact-name-error" : undefined}
          />
          {state.errors.name ? (
            <p className="field-error" id="contact-name-error">
              {state.errors.name}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label className="label" htmlFor="contact-email">
            Email address
          </label>
          <input
            className="input"
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            defaultValue={state.values.email}
            aria-invalid={state.errors.email ? true : undefined}
            aria-describedby={state.errors.email ? "contact-email-error" : undefined}
          />
          {state.errors.email ? (
            <p className="field-error" id="contact-email-error">
              {state.errors.email}
            </p>
          ) : null}
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="contact-subject">
          Subject
        </label>
        <input
          className="input"
          id="contact-subject"
          name="subject"
          type="text"
          required
          maxLength={150}
          defaultValue={state.values.subject}
          aria-invalid={state.errors.subject ? true : undefined}
          aria-describedby={state.errors.subject ? "contact-subject-error" : undefined}
        />
        {state.errors.subject ? (
          <p className="field-error" id="contact-subject-error">
            {state.errors.subject}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="label" htmlFor="contact-message">
          Message
        </label>
        <textarea
          className="textarea"
          id="contact-message"
          name="message"
          required
          rows={7}
          minLength={20}
          maxLength={5000}
          defaultValue={state.values.message}
          aria-invalid={state.errors.message ? true : undefined}
          aria-describedby={
            state.errors.message ? "contact-message-error contact-message-hint" : "contact-message-hint"
          }
        />
        {state.errors.message ? (
          <p className="field-error" id="contact-message-error">
            {state.errors.message}
          </p>
        ) : null}
        <p className="field-hint" id="contact-message-hint">
          Please do not include sensitive personal information. At least 20 characters.
        </p>
      </div>

      <div className="hp-field" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="form-actions">
        <SubmitButton label="Send message" pendingLabel="Sending…" />
        <p className="form-note">
          <MailIcon size={14} />
          Messages are stored securely for the site owner to review.
        </p>
      </div>
    </form>
  );
}
