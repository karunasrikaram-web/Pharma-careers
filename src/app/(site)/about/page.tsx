import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn how Pharma Careers helps job seekers discover pharmaceutical and life-sciences opportunities across India.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="page-shell">
      <div className="container">
        <div className="page-intro">
          <p className="eyebrow">ABOUT</p>
          <h1>Careers in pharma, made easier to find.</h1>
          <p className="page-sub">
            Pharma Careers is a focused job-discovery portal for pharmaceutical,
            biotechnology, clinical research, manufacturing and life-sciences roles across
            India.
          </p>
        </div>

        <div className="prose-page">
          <section>
            <h2>What this portal does</h2>
            <p>
              The portal brings vacancies from different departments into one clean,
              searchable place. Job seekers can search by role or keyword, filter by
              department and location, and open a dedicated page for each vacancy with the
              details needed to decide whether to apply.
            </p>
            <p>
              Departments covered include Quality Control (QC), Quality Assurance (QA),
              Production, Microbiology, R&amp;D, Regulatory Affairs, Pharmacovigilance,
              Clinical Research and Sales.
            </p>
          </section>

          <section>
            <h2>How listings work</h2>
            <p>
              Listings are published by the site administrator through a secure dashboard.
              Each listing is stored with a publication date, an optional application
              deadline and the employer&apos;s own application link when one is supplied.
              Vacancies are not scraped or invented automatically.
            </p>
            <p>
              When an application deadline passes, the listing is removed from public
              listings automatically but kept in the administrator&apos;s records for
              review.
            </p>
          </section>

          <section>
            <h2>Transparency</h2>
            <p>
              Any listing marked <strong>Demo</strong> is illustrative sample data used to
              demonstrate the portal. Demo listings are never verified live vacancies and
              do not link to real application pages.
            </p>
            <p>
              Pharma Careers does not guarantee employment, and it does not verify every
              claim made by an employer. Always confirm the role, employer and application
              details directly with the company before sharing personal information.
            </p>
          </section>

          <section>
            <h2>For employers and site owners</h2>
            <p>
              Routine publishing does not require source-code changes. An authorised
              administrator signs in, adds or edits a vacancy, previews it, and publishes
              it to the public site.
            </p>
          </section>

          <div className="prose-actions">
            <Link className="btn btn-primary" href="/jobs">
              Browse jobs
              <ArrowRightIcon size={16} />
            </Link>
            <Link className="btn btn-secondary" href="/contact">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
