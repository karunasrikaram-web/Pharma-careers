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

  return (
    <article className="job-card">
      {job.isSample && <span className="badge-sample">Illustrative sample vacancy</span>}
      <h3>
        <Link to={`/jobs/${job.id}`}>{job.title}</Link>
      </h3>
      <div className="job-company">{job.company}</div>
      <div className="job-meta">
        {job.location && <span>📍 {job.location}</span>}
        {published && <span>Published {published}</span>}
      </div>
      <div className="job-tags">
        {employment && <span className="tag">{employment}</span>}
        {locationType && <span className="tag">{locationType}</span>}
        {job.category && <span className="tag">{job.category}</span>}
      </div>
      {salary && <div className="job-meta">{salary}</div>}
      <Link className="view-details" to={`/jobs/${job.id}`}>
        View Details →
      </Link>
    </article>
  );
}
