import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import JobCard from "../components/JobCard";
import {
  DEPARTMENTS,
  fetchPublishedJobs,
  SAMPLE_JOBS,
  type PublicJob,
} from "../lib/publicJobs";

type LoadState = "loading" | "ready";

export default function Home() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchPublishedJobs().then((rows) => {
      if (cancelled) return;
      setJobs(rows);
      setState("ready");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const usingSamples = state === "ready" && jobs.length === 0;
  const shown = usingSamples ? SAMPLE_JOBS.slice(0, 6) : jobs.slice(0, 6);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("q", keyword.trim());
    if (location.trim()) params.set("location", location.trim());
    navigate(`/jobs${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const latestLabel = useMemo(() => (usingSamples ? "Sample Job Alerts" : "Latest Job Alerts"), [usingSamples]);

  return (
    <>
      <section className="hero">
          <div className="container">
            <span className="pill">Pharma &amp; Biotech Careers</span>
            <h1>Find your next pharma job.</h1>
            <p className="lede">
              Explore quality, production, R&amp;D, regulatory and clinical openings from leading
              pharmaceutical and biotech employers — updated daily.
            </p>
            <form className="search-card" onSubmit={handleSearch} role="search">
              <input
                type="search"
                placeholder="Keyword, e.g. QA Officer"
                aria-label="Keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <input
                type="search"
                placeholder="Location, e.g. Hyderabad"
                aria-label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                Search
              </button>
            </form>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>Browse by department</h2>
            </div>
            <div className="chips">
              {DEPARTMENTS.map((dept) => (
                <Link key={dept} className="chip" to={`/jobs?department=${encodeURIComponent(dept)}`}>
                  {dept}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="pill">Latest Jobs</span>
                <h2>{latestLabel}</h2>
              </div>
              <Link className="section-note" to="/jobs">
                View all jobs →
              </Link>
            </div>

            {state === "loading" ? (
              <div className="empty-state">Loading the latest openings…</div>
            ) : (
              <>
                {usingSamples && (
                  <p className="section-note" style={{ marginTop: 0 }}>
                    No live vacancies are published yet — below are illustrative sample vacancies to
                    preview the site.
                  </p>
                )}
                <div className="jobs-grid">
                  {shown.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
    </>
  );
}
