import type { Metadata } from "next";
import Link from "next/link";
import { UserDetailsForm } from "@/components/user-details-form";
import { MailIcon, ShieldIcon } from "@/components/icons";
import { getRegistrationConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Job Alerts",
  description:
    "Register for pharma job alerts and share your resume with the Pharma Careers site owner.",
  alternates: { canonical: "/job-alerts" },
};

export default function JobAlertsPage() {
  const config = getRegistrationConfig();

  return (
    <div className="page-shell">
      <div className="container">
        <div className="page-intro">
          <p className="eyebrow">JOB ALERTS</p>
          <h1>Tell us what you are looking for.</h1>
          <p className="page-sub">
            Share your details and resume so the site owner can review your profile for
            relevant pharma and life-sciences openings.
          </p>
        </div>

        <div className="contact-layout">
          <section className="contact-panel" aria-labelledby="job-alerts-form-heading">
            <h2 className="panel-title" id="job-alerts-form-heading">
              Registration details
            </h2>
            <UserDetailsForm
              kind="job_alert"
              variant="page"
              submitLabel="Save my details"
            />
          </section>

          <aside className="contact-aside">
            <div className="side-card">
              <h2>
                <MailIcon size={17} />
                What happens next
              </h2>
              <ul className="detail-list detail-list-compact">
                <li>Your details are saved in this website&apos;s database.</li>
                <li>The site owner reviews submissions in the admin dashboard.</li>
                <li>
                  You can also attach a resume for each job you apply to from the job page.
                </li>
                <li>This website does not send automatic email alerts.</li>
              </ul>
            </div>

            <div className="side-card side-card-muted">
              <h2>
                <ShieldIcon size={17} />
                Your information
              </h2>
              <p>
                {config.privacyNote ||
                  "Your details and resume are stored privately and are visible only to the site owner. They are not sold or published."}{" "}
                Read the{" "}
                <Link className="text-link" href="/privacy-policy">
                  Privacy Policy
                </Link>{" "}
                for the full explanation.
              </p>
            </div>

            <div className="side-card">
              <h2>Prefer a specific role?</h2>
              <p>
                Open any job page and use the &ldquo;Attach resume&rdquo; form to send your
                details for that opening.
              </p>
              <Link className="text-link" href="/jobs">
                Browse current jobs
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
