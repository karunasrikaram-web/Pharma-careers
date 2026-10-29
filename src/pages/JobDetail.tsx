import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  EMPLOYMENT_TYPE_LABELS,
  LOCATION_TYPE_LABELS,
  fetchPublishedJob,
  findSampleJob,
  formatPublishedDate,
  formatSalary,
  type PublicJob,
} from "../lib/publicJobs";

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<PublicJob | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setJob(null);
      return;
    }
    let cancelled = false;
    if (id.startsWith("sample-")) {
      setJob(findSampleJob(id));
      return;
    }
    fetchPublishedJob(id).then((row) => {
      if (!cancelled) setJob(row);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <section className="page">
          <div className="container page-narrow">
            <Link to="/jobs" className="section-note">
              ← Back to all jobs
            </Link>

            {job === undefined ? (
              <div className="empty-state" style={{ marginTop: 20 }}>
                Loading vacancy…
              </div>
            ) : job === null ? (
              <div className="empty-state" style={{ marginTop: 20 }}>
                <p style={{ marginTop: 0 }}>This vacancy could not be found — it may have been filled or removed.</p>
                <Link className="btn btn-primary" to="/jobs">
                  Browse all jobs
                </Link>
              </div>
            ) : (
              <div style={{ marginTop: 20 }}>
                {job.isSample && <span className="badge-sample">Illustrative sample vacancy</span>}
                <h1 style={{ marginTop: 12 }}>{job.title}</h1>
                <p className="lede" style={{ marginBottom: 20 }}>
                  {job.company}
                  {job.location ? ` · ${job.location}` : ""}
                </p>

                <dl className="detail-list" style={{ marginBottom: 28 }}>
                  {job.employmentType && (
                    <>
                      <dt>Employment type</dt>
                      <dd>{EMPLOYMENT_TYPE_LABELS[job.employmentType] ?? job.employmentType}</dd>
                    </>
                  )}
                  {job.locationType && (
                    <>
                      <dt>Work model</dt>
                      <dd>{LOCATION_TYPE_LABELS[job.locationType] ?? job.locationType}</dd>
                    </>
                  )}
                  {job.level && (
                    <>
                      <dt>Level</dt>
                      <dd>{job.level}</dd>
                    </>
                  )}
                  {job.category && (
                    <>
                      <dt>Department</dt>
                      <dd>{job.category}</dd>
                    </>
                  )}
                  {formatSalary(job) && (
                    <>
                      <dt>Salary</dt>
                      <dd>{formatSalary(job)}</dd>
                    </>
                  )}
                  {formatPublishedDate(job) && (
                    <>
                      <dt>Published</dt>
                      <dd>{formatPublishedDate(job)}</dd>
                    </>
                  )}
                </dl>

                {job.description && (
                  <div className="prose">
                    <h2>About the role</h2>
                    <p>{job.description}</p>
                  </div>
                )}

                {job.requirements && (
                  <div className="prose">
                    <h2>Requirements</h2>
                    <p>{job.requirements}</p>
                  </div>
                )}

                <div style={{ marginTop: 32 }}>
                  <Link className="btn btn-primary" to="/contact">
                    Enquire about this role
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
    </>
  );
}
