"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/actions/auth";

const initialState: LoginState = {};

export function AdminLoginForm({ nextPath }: { nextPath?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form className="admin-auth-form" action={formAction}>
      {state.error ? (
        <p className="notice notice-error" role="alert" style={{ marginBottom: 0 }}>
          {state.error}
        </p>
      ) : null}

      <input type="hidden" name="next" value={nextPath || "/admin"} />

      <div className="field">
        <label className="label" htmlFor="admin-email">
          Email address
        </label>
        <input
          className="input"
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          placeholder="you@example.com"
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="admin-password">
          Password
        </label>
        <input
          className="input"
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
          placeholder="Your password"
        />
      </div>

      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in to dashboard"}
      </button>
    </form>
  );
}
