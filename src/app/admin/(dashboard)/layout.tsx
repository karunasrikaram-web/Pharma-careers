import type { Metadata } from "next";
import type { ReactNode } from "react";
import { logoutAction } from "@/actions/auth";
import { AdminNav } from "@/components/admin-nav";
import { LogOutIcon } from "@/components/admin-icons";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireAdmin();
  const initials = (session.name || session.email)
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-head">
          <div>
            <p className="brand">Pharma Careers</p>
            <span>Admin console</span>
          </div>
        </div>

        <AdminNav />

        <div className="admin-sidebar-foot">
          <form action={logoutAction}>
            <button type="submit" className="admin-nav-link">
              <LogOutIcon size={15} />
              Logout
            </button>
          </form>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <p className="admin-topbar-title">Content management</p>
          <div className="admin-topbar-meta">
            <span className="admin-role">Signed in as administrator</span>
            <div className="admin-user">
              <span className="admin-avatar" aria-hidden="true">
                {initials}
              </span>
              <span className="admin-user-email" title={session.email}>
                {session.email}
              </span>
            </div>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
