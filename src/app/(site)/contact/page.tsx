import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { MailIcon, ShieldIcon } from "@/components/icons";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact the Pharma Careers team about a listing, a technical issue or a privacy question.",
  alternates: { canonical: "/contact" },
};

export const dynamic = "force-dynamic";

export default function ContactPage() {
  const settings = getSettings();
  const contactEmail =
    settings.contact_email.trim() || process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

  return (
    <div className="page-shell">
      <div className="container">
        <div className="page-intro">
          <p className="eyebrow">CONTACT</p>
          <h1>Get in touch.</h1>
          <p className="page-sub">
            Have a question about a listing or the portal? Send a message using the form
            below.
          </p>
        </div>

        <div className="contact-layout">
          <section className="contact-panel" aria-labelledby="contact-form-heading">
            <h2 className="panel-title" id="contact-form-heading">
              Send a message
            </h2>
            <ContactForm />
          </section>

          <aside className="contact-aside">
            <div className="side-card">
              <h2>What we can help with</h2>
              <ul className="detail-list detail-list-compact">
                <li>Questions about how listings are published.</li>
                <li>Reporting inaccurate or expired job information.</li>
                <li>Technical problems with search or a job page.</li>
                <li>Privacy or data questions.</li>
              </ul>
            </div>

            <div className="side-card">
              <h2>
                <MailIcon size={17} />
                Contact details
              </h2>
              {contactEmail ? (
                <p>
                  <a className="text-link" href={`mailto:${contactEmail}`}>
                    {contactEmail}
                  </a>
                </p>
              ) : (
                <p className="muted-text">
                  A public contact email address has not been configured yet. Messages sent
                  through this form are stored for the site owner to review.
                </p>
              )}
            </div>

            <div className="side-card side-card-muted">
              <h2>
                <ShieldIcon size={17} />
                A note about applications
              </h2>
              <p>
                Job pages include an optional form that saves your details and resume for the
                site owner to review. It does not replace the employer&apos;s official hiring
                process. Apply through the employer&apos;s official application link when one
                is shown, and verify the vacancy directly with the employer.
              </p>
              <Link className="text-link" href="/disclaimer">
                Read the full disclaimer
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
