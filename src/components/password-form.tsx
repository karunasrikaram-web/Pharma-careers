"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/actions/admin";
import type { PasswordState } from "@/lib/forms";

const INITIAL: PasswordState = { ok: false, errors: {} };

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="field-error">{message}</span>;
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, INITIAL);
  const errors = state.errors ?? {};

  return (
    <form className="admin-form" action={formAction}>
      {state.message ? (
        <p
          className={state.ok ? "notice notice-success" : "notice notice-error"}
          role={state.ok ? "status" : "alert"}
          style={{ marginBottom: 0 }}
        >
          {state.message}
        </p>
      ) : null}

      <div className="field">
        <label className="label" htmlFor="current-password">
          Current password
        </label>
        <input
          className="input"
          id="current-password"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
        />
        <ErrorText message={errors.current_password} />
      </div>

      <div className="field">
        <label className="label" htmlFor="new-password">
          New password
        </label>
        <input
          className="input"
          id="new-password"
          name="new_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={200}
        />
        <span className="field-hint">
          At least 12 characters, including a letter and a number.
        </span>
        <ErrorText message={errors.new_password} />
      </div>

      <div className="field">
        <label className="label" htmlFor="confirm-password">
          Confirm new password
        </label>
        <input
          className="input"
          id="confirm-password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          maxLength={200}
        />
        <ErrorText message={errors.confirm_password} />
      </div>

      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
