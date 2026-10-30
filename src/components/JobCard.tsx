import { Link } from "react-router-dom";
import {
  EMPLOYMENT_TYPE_LABELS,
  LOCATION_TYPE_LABELS,
  formatPublishedDate,
  formatSalary,
  type PublicJob,
} from "../lib/publicJobs";

export default function JobCard({ job }: { job: PublicJob }) {
  const employment = job.employmentType ? EMPLOYMENT_TYPE_LABELS[job.employmentType] ?? job.employmentType : null;
  const locationType = job.locationType ? LOCATION_TYPE_LABELS[job.locationType] ?? job.locationType : null;
  const salary = formatSalary(job);
  const published = formatPublishedDate(job);

  const meta = [
    job.location,
    employment,
    locationType,
    published ? `Published ${published}` : null,
    salary,
  ].filter(Boolean) as string[];

  return (
    <article className="job-card">
      <div className="job-card-top">
        <div>
          <h3>
            <Link to={`/jobs/${job.id}`}>{job.title}</Link>
          </h3>
          <div className="job-company">{job.company}</div>
        </div>
        {job.isSample ? (
          <span className="badge-sample">Illustrative sample vacancy</span>
        ) : job.category ? (
          <span className="badge-cat">{job.category}</span>
        ) : null}
      </div>
      <div className="job-card-bottom">
        <div className="job-meta">
          {meta.map((item, i) => (
            <span key={i}>{item}</span>
          ))}
        </div>
        <Link className="view-details" to={`/jobs/${job.id}`}>
          View Details →
        </Link>
      </div>
    </article>
  );
}