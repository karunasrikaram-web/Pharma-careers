import Link from "next/link";
import { SITE } from "@/lib/constants";
import { JobAlertsButton } from "@/components/job-alerts-popup";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <p className="footer-brand">{SITE.name}</p>
            <p className="footer-desc">{SITE.description}</p>
            <JobAlertsButton
              label="Register for Job Alerts"
              className="btn btn-secondary footer-alert-button"
            />
          </div>
          <nav className="footer-links" aria-label="Footer navigation">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/articles">Articles</Link>
            <Link href="/job-alerts">Job Alerts</Link>
            <Link href="/privacy-policy">Privacy Policy</Link>
            <Link href="/disclaimer">Disclaimer</Link>
          </nav>
        </div>
        <div className="footer-bottom">
          <p>
            © {year} {SITE.name}. All rights reserved.
          </p>
          <p>Built for pharma and life-sciences careers across India.</p>
        </div>
      </div>
    </footer>
  );
}
