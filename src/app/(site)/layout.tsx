import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { JobAlertsLayer } from "@/components/job-alerts-layer";
import { isReadOnlyFallback } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const readOnly = isReadOnlyFallback();

  return (
    <>
      {readOnly ? (
        <div className="read-only-banner" role="status">
          <div className="container">
            <strong>Demo mode.</strong> No content database is connected, so this
            deployment is showing a read-only sample of the site. Contact forms,
            job-alert sign-ups and admin sign-in are disabled.
          </div>
        </div>
      ) : null}
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <JobAlertsLayer />
    </>
  );
}
