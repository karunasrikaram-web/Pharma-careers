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
            <div className="hero-top">
              <span className="pill">Pharma &amp; Life Sciences Careers</span>
            </div>
            <h1>Find your next pharma job.</h1>
            <p className="lede">
              Explore quality, production, R&amp;D, regulatory and clinical openings from leading
              pharmaceutical and biotech employers — updated daily.
            </p>
            <form className="search-card" onSubmit={handleSearch} role="search">
              <div className="search-field">
                <label htmlFor="home-keyword">Job title or keyword</label>
                <input
                  id="home-keyword"
                  type="search"
                  placeholder="e.g. Quality Control Analyst"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
              <div className="search-field">
                <label htmlFor="home-location">Location</label>
                <input
                  id="home-location"
                  type="search"
                  placeholder="City or state"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Search Jobs
              </button>
            </form>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <p className="section-label">Browse by department</p>
            <div className="chips">
              {DEPARTMENTS.map((dept) => (
                <Link key={dept} className="chip" to={`/jobs?department=${encodeURIComponent(dept)}`}>
                  {dept}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 8 }}>
          <div className="container">
            <div className="section-head">
              <div>
                <h2>{latestLabel}</h2>
                <p className="section-sub">
                  {usingSamples
                    ? "Illustrative listings to preview the homepage layout."
                    : "Fresh openings from verified pharma employers."}
                </p>
              </div>
              <div className="section-actions">
                <Link className="section-note" to="/jobs">
                  View all jobs →
                </Link>
              </div>
            </div>

            {state === "loading" ? (
              <div className="empty-state">Loading the latest openings…</div>
            ) : (
              <>
                <div className="jobs-grid">
                  {shown.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="cta-banner">
              <span className="cta-tag">🔔 Free to browse</span>
              <h2>Find the role that moves your pharma career forward.</h2>
              <p>
                Quality, production, R&amp;D, regulatory and clinical openings from leading
                employers — no account needed to apply.
              </p>
              <div className="cta-row">
                <Link className="btn btn-lime" to="/jobs">
                  Browse all jobs
                </Link>
                <span className="cta-note">Candidates never log in · One short form per role</span>
              </div>
            </div>
          </div>
        </section>
    </>
  );
}