import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { LockIcon } from "@/components/admin-icons";
import { getSession, sanitizeNextPath } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administrator sign in",
  robots: { index: false, follow: false, nocache: true },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AdminLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession();
  if (session) redirect("/admin");

  const params = await searchParams;
  const nextPath = sanitizeNextPath(first(params.next));
  const loggedOut = first(params.loggedOut) === "1";

  return (
    <div className="admin-auth-page">
      <header className="admin-auth-header">
        <Link href="/" className="brand">
          Pharma Careers
          <span>Administrator portal</span>
        </Link>
      </header>

      <main className="admin-auth-main">
        <div className="admin-auth-card">
          <span className="admin-auth-icon" aria-hidden="true">
            <LockIcon size={21} />
          </span>
          <h1>Administrator sign in</h1>
          <p>
            This area is private. Sign in with the administrator account provided by the site
            owner.
          </p>

          {loggedOut ? (
            <p className="notice notice-success" role="status">
              You have been signed out safely.
            </p>
          ) : null}

          <AdminLoginForm nextPath={nextPath} />

          <div className="admin-auth-foot">
            <p>Public registration never grants administrator access.</p>
            <p style={{ marginTop: 6 }}>
              <Link href="/">Return to the public website</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
