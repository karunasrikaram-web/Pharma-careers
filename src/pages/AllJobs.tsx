import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import JobCard from "../components/JobCard";
import {
  DEPARTMENTS,
  fetchPublishedJobs,
  SAMPLE_JOBS,
  type PublicJob,
} from "../lib/publicJobs";

function matches(job: PublicJob, q: string, loc: string, dept: string): boolean {
  if (dept && (job.category ?? "") !== dept) return false;
  if (q) {
    const hay = `${job.title} ${job.company} ${job.category ?? ""} ${job.level ?? ""}`.toLowerCase();
    if (!hay.includes(q.toLowerCase())) return false;
  }
  if (loc && !(job.location ?? "").toLowerCase().includes(loc.toLowerCase())) return false;
  return true;
}

export default function AllJobs() {
  const [params, setParams] = useSearchParams();
  const [jobs, setJobs] = useState<PublicJob[] | null>(null);

  const q = params.get("q") ?? "";
  const location = params.get("location") ?? "";
  const department = params.get("department") ?? "";

  const [keywordInput, setKeywordInput] = useState(q);
  const [locationInput, setLocationInput] = useState(location);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedJobs().then((rows) => {
      if (!cancelled) setJobs(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setKeywordInput(q);
    setLocationInput(location);
  }, [q, location]);

  const usingSamples = jobs !== null && jobs.length === 0;
  const source = jobs === null ? [] : usingSamples ? SAMPLE_JOBS : jobs;

  const filtered = useMemo(
    () => source.filter((job) => matches(job, q, location, department)),
    [source, q, location, department]
  );

  const applySearch = (e: FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (keywordInput.trim()) next.set("q", keywordInput.trim());
    if (locationInput.trim()) next.set("location", locationInput.trim());
    if (department) next.set("department", department);
    setParams(next);
  };

  const clearAll = () => setParams(new URLSearchParams());

  return (
    <>
      <section className="page">
          <div className="container">
            <span className="pill">All Jobs</span>
            <h1>{department || "Every open role, in one list"}</h1>
            <p className="lede">
              Search live pharmaceutical and biotech vacancies by keyword, location and department.
            </p>

            <form className="search-card" onSubmit={applySearch} role="search" style={{ margin: "0 0 26px" }}>
              <input
                type="search"
                placeholder="Keyword, e.g. QA Officer"
                aria-label="Keyword"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
              />
              <input
                type="search"
                placeholder="Location, e.g. Hyderabad"
                aria-label="Location"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                Search
              </button>
            </form>

            <div className="chips" style={{ marginBottom: 28 }}>
              <Link className={`chip ${!department ? "active" : ""}`} to="/jobs">
                All departments
              </Link>
              {DEPARTMENTS.map((dept) => (
                <Link
                  key={dept}
                  className={`chip ${department === dept ? "active" : ""}`}
                  to={`/jobs?${new URLSearchParams({ ...(q ? { q } : {}), ...(location ? { location } : {}), department: dept })}`}
                >
                  {dept}
                </Link>
              ))}
            </div>

            {jobs === null ? (
              <div className="empty-state">Loading vacancies…</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <p style={{ marginTop: 0 }}>No vacancies match your search.</p>
                <button type="button" className="btn btn-primary" onClick={clearAll}>
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                {usingSamples && (
                  <p className="section-note" style={{ marginTop: 0 }}>
                    No live vacancies are published yet — below are illustrative sample vacancies to
                    preview the site.
                  </p>
                )}
                <p className="section-note" style={{ marginTop: 0 }}>
                  {filtered.length} {filtered.length === 1 ? "vacancy" : "vacancies"}
                </p>
                <div className="jobs-grid">
                  {filtered.map((job) => (
                    <JobCard key={job.id} job={{ ...job, isSample: usingSamples }} />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
    </>
  );
}
