import {
  BriefcaseIcon,
  CalendarIcon,
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
} from "@/components/icons";
import { DemoNotice } from "@/components/demo-notice";
import { ReportDialog } from "@/components/report-dialog";
import { UserDetailsForm } from "@/components/user-details-form";
import {
  experienceLabel,
  formatDate,
  isExpired,
  splitLines,
  splitParagraphs,
} from "@/lib/dates";
import { safeExternalUrl } from "@/lib/urls";
import type { Job } from "@/lib/types";

interface JobDetailProps {
  job: Job;
  preview?: boolean;
}

function ApplyAction({
  job,
  preview,
  className,
}: {
  job: Job;
  preview: boolean;
  className?: string;
}) {
  if (preview) {
    return (
      <span className={`btn btn-primary is-disabled ${className ?? ""}`} aria-disabled="true">
        Apply Now
      </span>
    );
  }

  const url = safeExternalUrl(job.application_url);
  if (!url) {
    return (
      <span className={`btn btn-primary is-disabled ${className ?? ""}`} aria-disabled="true">
        Apply Now
      </span>
    );
  }

  return (
    <a
      className={`btn btn-primary ${className ?? ""}`}
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      Apply Now
      <ExternalLinkIcon size={16} />
    </a>
  );
}

function applyNote(job: Job, preview: boolean): string {
  if (preview) {
    return "Application links are disabled while previewing this listing.";
  }
  if (job.is_demo) {
    return "This is a sample listing. No application link is available.";
  }
  if (!safeExternalUrl(job.application_url)) {
    return "The employer has not provided an application link for this listing.";
  }
  return "Opens the employer’s official application page in a new tab.";
}

export function JobDetail({ job, preview = false }: JobDetailProps) {
  const description = splitParagraphs(job.description);
  const responsibilities = splitLines(job.responsibilities);
  const qualifications = splitLines(job.qualifications);
  const skills = splitLines(job.skills);
  const deadlinePassed = isExpired(job.application_deadline);

  return (
    <div className="job-detail">
      <header className="job-detail-head">
        <div className="detail-badges">
          <span className="badge badge-department">{job.department}</span>
          {job.is_featured ? <span className="tag tag-featured">Featured</span> : null}
          {job.is_demo ? <span className="badge badge-demo">Demo listing</span> : null}
          {deadlinePassed ? <span className="badge badge-expired">Deadline passed</span> : null}
        </div>

        <h1 className="detail-title">{job.title}</h1>
        <p className="detail-company">{job.company_name}</p>

        <div className="detail-head-meta">
          <span>
            <MapPinIcon size={15} />
            {job.city}, {job.state}
          </span>
          <span>
            <BriefcaseIcon size={15} />
            {experienceLabel(job.experience_min, job.experience_max)}
          </span>
          {job.employment_type ? (
            <span>
              <ClockIcon size={15} />
              {job.employment_type}
            </span>
          ) : null}
          <span>
            <CalendarIcon size={15} />
            Published {formatDate(job.published_at)}
          </span>
        </div>

        <div className="detail-head-actions">
          <ApplyAction job={job} preview={preview} className="btn-lg" />
          {!preview && !deadlinePassed ? (
            <a className="btn btn-secondary btn-lg" href="#apply-with-resume">
              Attach resume
            </a>
          ) : null}
          <p className="apply-note">{applyNote(job, preview)}</p>
        </div>
      </header>

      {job.is_demo ? (
        <DemoNotice>
          Do not treat this vacancy as verified. It exists only to demonstrate the portal.
        </DemoNotice>
      ) : null}

      <div className="detail-layout">
        <article className="detail-main">
          <section className="detail-card" aria-labelledby="about-role">
            <h2 id="about-role">About the role</h2>
            <div className="detail-description">
              {description.length > 0 ? (
                description.map((paragraph, index) => <p key={index}>{paragraph}</p>)
              ) : (
                <p>{job.description}</p>
              )}
            </div>
          </section>

          {responsibilities.length > 0 ? (
            <section className="detail-card" aria-labelledby="responsibilities">
              <h2 id="responsibilities">Responsibilities</h2>
              <ul className="detail-list">
                {responsibilities.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {qualifications.length > 0 ? (
            <section className="detail-card" aria-labelledby="qualifications">
              <h2 id="qualifications">Required qualifications</h2>
              <ul className="detail-list">
                {qualifications.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {skills.length > 0 ? (
            <section className="detail-card" aria-labelledby="skills">
              <h2 id="skills">Required skills</h2>
              <ul className="detail-list">
                {skills.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {job.application_instructions ? (
            <section className="detail-card" aria-labelledby="instructions">
              <h2 id="instructions">Application instructions</h2>
              <div className="detail-description">
                {splitParagraphs(job.application_instructions).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>
          ) : null}
        </article>

        <aside className="detail-side" aria-label="Job overview">
          <div className="side-card">
            <h2>Job overview</h2>
            <dl className="overview-list">
              <div>
                <dt>Department</dt>
                <dd>{job.department}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>
                  {job.city}, {job.state}
                </dd>
              </div>
              <div>
                <dt>Experience</dt>
                <dd>{experienceLabel(job.experience_min, job.experience_max)}</dd>
              </div>
              <div>
                <dt>Employment type</dt>
                <dd>{job.employment_type ?? "Not specified"}</dd>
              </div>
              <div>
                <dt>Salary</dt>
                <dd>{job.salary_range ?? "Not disclosed"}</dd>
              </div>
              <div>
                <dt>Published</dt>
                <dd>{formatDate(job.published_at)}</dd>
              </div>
              <div>
                <dt>Application deadline</dt>
                <dd>
                  {job.application_deadline ? (
                    <>
                      {formatDate(job.application_deadline)}
                      {deadlinePassed ? <span className="deadline-note">Passed</span> : null}
                    </>
                  ) : (
                    "Not specified"
                  )}
                </dd>
              </div>
            </dl>

            <ApplyAction job={job} preview={preview} className="apply-side" />
            <p className="apply-note">{applyNote(job, preview)}</p>

            {!preview ? (
              <>
                <div className="side-divider" />
                <ReportDialog jobId={job.id} jobTitle={job.title} />
              </>
            ) : null}
          </div>

          <div className="side-card side-card-muted">
            <h2>Before you apply</h2>
            <p>
              Verify the employer, role and application details directly with the company.
              Pharma Careers does not guarantee employment or the accuracy of third-party
              listings.
            </p>
          </div>
        </aside>
      </div>

      {!preview && !deadlinePassed ? (
        <section
          className="detail-card resume-application-card"
          id="apply-with-resume"
          aria-labelledby="apply-with-resume-heading"
        >
          <div className="resume-application-head">
            <div>
              <p className="eyebrow">APPLY</p>
              <h2 id="apply-with-resume-heading">Attach your resume</h2>
              <p className="resume-application-intro">
                Send your details and resume to the site owner for this opening. Your
                submission is stored in this website&rsquo;s database and appears in the admin
                dashboard under User Details. It does not send your application to the employer
                directly — use the official application link above when one is available.
              </p>
              {job.is_demo ? (
                <p className="form-note">
                  This is a sample listing. A submission here demonstrates the resume workflow
                  and is not a real application.
                </p>
              ) : null}
            </div>
          </div>

          <UserDetailsForm
            kind="job_application"
            jobId={job.id}
            jobTitle={job.title}
            variant="job"
            submitLabel="Submit my details and resume"
          />
        </section>
      ) : null}
    </div>
  );
}
