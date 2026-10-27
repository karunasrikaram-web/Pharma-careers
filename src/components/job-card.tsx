import Link from "next/link";
import {
  ArrowRightIcon,
  BriefcaseIcon,
  CalendarIcon,
  MapPinIcon,
} from "@/components/icons";
import { experienceLabel, formatDate, isRecentlyPosted } from "@/lib/dates";
import type { Job } from "@/lib/types";

export function JobCard({ job }: { job: Job }) {
  const tag = job.is_featured
    ? { label: "Featured", className: "tag-featured" }
    : isRecentlyPosted(job.published_at)
      ? { label: "Recently posted", className: "tag-recent" }
      : null;

  return (
    <article className="job-card">
      <div className="job-card-main">
        <div className="job-title-row">
          <h3 className="job-title">
            <Link href={`/jobs/${job.slug}`}>{job.title}</Link>
          </h3>
          {job.is_demo ? <span className="badge badge-demo">Demo</span> : null}
        </div>
        <p className="job-company">{job.company_name}</p>
        <div className="job-meta">
          <span>
            <MapPinIcon size={14} />
            {job.city}, {job.state}
          </span>
          <span>
            <BriefcaseIcon size={14} />
            {experienceLabel(job.experience_min, job.experience_max)}
          </span>
          <span>
            <CalendarIcon size={14} />
            Published {formatDate(job.published_at)}
          </span>
          <span className="job-department">{job.department}</span>
        </div>
      </div>
      <div className="job-card-side">
        <div className="job-tags">
          {tag ? <span className={`tag ${tag.className}`}>{tag.label}</span> : null}
        </div>
        <Link href={`/jobs/${job.slug}`} className="view-link">
          View Details
          <ArrowRightIcon size={15} />
        </Link>
      </div>
    </article>
  );
}
