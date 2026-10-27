import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "Important information about using Pharma Careers, verifying vacancies and applying to jobs.",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <div className="page-shell">
      <div className="container">
        <div className="page-intro">
          <p className="eyebrow">DISCLAIMER</p>
          <h1>Disclaimer</h1>
          <p className="page-sub">Please read this before applying to a listing.</p>
        </div>

        <div className="prose-page">
          <section>
            <h2>A job-discovery portal</h2>
            <p>
              Pharma Careers helps visitors discover pharmaceutical and life-sciences job
              opportunities. It is not a recruitment agency and it does not employ applicants.
              Job pages offer an optional form that saves your details and resume for the site
              owner&apos;s review; submitting that form does not contact the employer by itself.
              To apply formally, use the employer&apos;s own website or the process stated in
              the listing.
            </p>
          </section>

          <section>
            <h2>Verify every vacancy</h2>
            <p>
              Listings may be created by the site owner or, in future, supplied by trusted
              job sources. The portal does not guarantee that a vacancy is still open, that
              an employer exists, or that the details in a listing are complete and
              accurate. Always verify the role, company, location, salary and application
              process directly with the employer before sharing personal information or
              paying any fee.
            </p>
            <p>
              Never pay a fee to obtain a job interview, and do not send identity documents,
              bank details or passwords to an unverified contact.
            </p>
          </section>

          <section>
            <h2>Demo listings</h2>
            <p>
              Listings marked <strong>Demo</strong> are illustrative sample records used to
              demonstrate the portal. They are not verified live vacancies. They may use
              fictional employer names and do not include real application links. A resume
              submitted through a demo listing demonstrates the workflow; it is not a real
              application.
            </p>
          </section>

          <section>
            <h2>External links</h2>
            <p>
              Job pages may link to an employer&apos;s official application page. Those
              websites are controlled by third parties and are governed by their own terms
              and privacy policies. Pharma Careers is not responsible for their content,
              availability or handling of your information.
            </p>
          </section>

          <section>
            <h2>No guarantee of employment</h2>
            <p>
              Nothing on this website is a promise or guarantee of employment, an interview,
              a salary or a particular outcome. Hiring decisions belong entirely to
              employers.
            </p>
          </section>

          <section>
            <h2>Reporting a problem</h2>
            <p>
              If a listing appears inaccurate, expired, duplicated or suspicious, use the
              &ldquo;Report this listing&rdquo; action on the job page or the{" "}
              <Link className="text-link" href="/contact">
                contact form
              </Link>
              . Reports are reviewed by the site owner.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
