import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="error-page">
      <div>
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>The page may have moved, been removed, or never existed.</p>
        <div className="form-actions" style={{ justifyContent: "center" }}>
          <Link href="/" className="btn btn-primary">
            Back to home
          </Link>
          <Link href="/jobs" className="btn btn-secondary">
            Browse jobs
          </Link>
        </div>
      </div>
    </div>
  );
}
