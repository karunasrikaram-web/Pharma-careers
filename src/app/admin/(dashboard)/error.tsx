"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="admin-panel">
      <div className="admin-panel-body">
        <p className="eyebrow">ADMIN ERROR</p>
        <h1 style={{ fontSize: 24 }}>The dashboard could not load this request.</h1>
        <p className="admin-hint" style={{ marginTop: 8, marginBottom: 18 }}>
          A database or network error occurred. Nothing was changed. Retry the request, and
          check the server logs if the problem continues.
        </p>
        <div className="admin-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => reset()}>
            Try again
          </button>
          <a href="/admin" className="btn btn-secondary btn-sm">
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
