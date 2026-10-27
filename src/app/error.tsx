"use client";

import { useEffect } from "react";

export default function ErrorPage({
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
    <div className="error-page">
      <div>
        <p className="eyebrow">SOMETHING WENT WRONG</p>
        <h1>We could not load this page.</h1>
        <p>
          The database or a network request may be temporarily unavailable. No content was
          changed. You can retry or return to the homepage.
        </p>
        <div className="form-actions" style={{ justifyContent: "center" }}>
          <button type="button" className="btn btn-primary" onClick={() => reset()}>
            Try again
          </button>
          <a href="/" className="btn btn-secondary">
            Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
