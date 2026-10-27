import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Pharma Careers collects, stores and handles information submitted through the website.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPage() {
  return (
    <div className="page-shell">
      <div className="container">
        <div className="page-intro">
          <p className="eyebrow">PRIVACY</p>
          <h1>Privacy Policy</h1>
          <p className="page-sub">Last updated: 27 October 2026</p>
        </div>

        <div className="prose-page">
          <section>
            <h2>Overview</h2>
            <p>
              Pharma Careers is a job-discovery website. This policy explains what
              information the deployed application collects, why it is collected and how it
              is handled. The site does not require visitors to create an account to browse
              jobs.
            </p>
          </section>

          <section>
            <h2>Information collected</h2>
            <p>
              <strong>Contact messages.</strong> When you use the contact form, the
              application stores the name, email address, subject and message you submit.
              It also stores a one-way hash of your IP address and the time of submission
              for abuse prevention.
            </p>
            <p>
              <strong>Listing reports.</strong> When you report a listing, the application
              stores the reason, any details you provide, an optional email address, the
              related job, a one-way hash of your IP address and the time of submission.
            </p>
            <p>
              <strong>Administrator sign-in.</strong> Authorised administrators sign in with
              an email address and password. Passwords are stored only as salted scrypt
              hashes. A session cookie keeps an administrator signed in for a limited time.
              The application stores session records, sign-in attempt records and the
              administrator&apos;s name and email address.
            </p>
            <p>
              <strong>Job-alert registration.</strong> When you register for job alerts through
              the popup or the job alerts page, this application stores the details you submit
              — name, email address, phone number, city, state, highest qualification,
              experience level, optional preferred departments, an optional message and an
              optional resume — in its own database. The site owner reviews these submissions
              in the admin dashboard. This website does not send automatic email alerts.
            </p>
            <p>
              <strong>Job applications.</strong> Job pages include an optional resume upload.
              If you choose to use it, the application stores the same details listed above plus
              the resume file you attach. Attached resumes are stored as private files in the
              application database and are available only to signed-in administrators. A
              submission through this form does not contact the employer directly; use the
              employer&apos;s official application link when one is provided.
            </p>
            <p>
              <strong>Server logs.</strong> The hosting provider may automatically record
              standard technical information such as request times, IP addresses, browser
              details and error logs as part of operating the service.
            </p>
          </section>

          <section>
            <h2>Cookies</h2>
            <p>
              The public website does not use advertising or analytics cookies. A single
              essential, HTTP-only session cookie is used only for administrator sign-in.
              It is not accessible to client-side JavaScript. Browser session storage is used
              to remember that you have dismissed the job-alerts popup so that it does not
              reappear during the same browsing session. The website does not embed third-party
              forms on public pages.
            </p>
          </section>

          <section>
            <h2>How information is used</h2>
            <ul>
              <li>To review and respond to messages and listing reports.</li>
              <li>To review job-alert registrations and resume submissions.</li>
              <li>To protect the site against spam, abuse and unauthorised access.</li>
              <li>To operate administrator authentication and job management.</li>
              <li>To diagnose technical problems and maintain service reliability.</li>
            </ul>
            <p>
              The application does not sell personal information. It does not include
              third-party advertising, tracking pixels or analytics unless the site owner
              explicitly adds them and updates this policy.
            </p>
          </section>

          <section>
            <h2>Retention and access</h2>
            <p>
              Contact messages, listing reports, job-alert registrations, application details,
              resumes and job records are kept until the site owner deletes them or they are no
              longer needed. Administrator accounts and sessions are retained only as required
              to operate the site securely.
            </p>
            <p>
              Access to contact messages, reports, user details, resumes and job management is
              restricted to authorised administrators. Resume downloads require a signed-in
              administrator session and are never served through public routes. Database
              access is server-side; no database credentials are exposed to visitors.
            </p>
          </section>

          <section>
            <h2>Your choices</h2>
            <p>
              You can choose not to submit the contact form, report form, job-alert
              registration or resume upload. If you have submitted information and would like
              it removed, use the contact form and describe your request. The site owner can
              locate and delete stored messages, registrations, applications and resumes
              through the admin dashboard.
            </p>
          </section>

          <section>
            <h2>Changes to this policy</h2>
            <p>
              This policy may be updated when the site&apos;s features or legal obligations
              change. The date at the top of this page shows the latest revision.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              For privacy questions, use the{" "}
              <a className="text-link" href="/contact">
                contact form
              </a>
              . A public contact email address will be published here once the site owner
              configures one.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
