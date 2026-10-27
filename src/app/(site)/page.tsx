import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { ArticleCard } from "@/components/article-card";
import { DemoNotice } from "@/components/demo-notice";
import { DepartmentChips } from "@/components/department-chips";
import { EmptyState } from "@/components/empty-state";
import { JobCard } from "@/components/job-card";
import { SearchPanel } from "@/components/search-panel";
import { getLatestPublicArticles } from "@/lib/articles";
import { countPublicDemoJobs, getLatestPublicJobs } from "@/lib/jobs";
import { getSettings, isEnabled } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Find your next pharma job",
  description:
    "Discover the latest pharmaceutical and life sciences job opportunities across India. Search by role, department and location.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const jobs = getLatestPublicJobs(5);
  const demoCount = countPublicDemoJobs();
  const articles = getLatestPublicArticles(3);
  const settings = getSettings();
  const showJobs = isEnabled(settings.homepage_show_jobs);
  const showArticles = isEnabled(settings.homepage_show_articles);

  return (
    <>
      <section className="hero">
        <div className="container">
          <p className="eyebrow">PHARMA &amp; LIFE SCIENCES CAREERS</p>
          <h1 className="hero-title">Find your next pharma job.</h1>
          <p className="hero-sub">
            Discover the latest pharmaceutical and life sciences job opportunities across
            India.
          </p>
          <SearchPanel idPrefix="home" />
        </div>
      </section>

      <section className="section departments-section" aria-labelledby="departments-heading">
        <div className="container">
          <h2 className="section-title-sm" id="departments-heading">
            Browse by department
          </h2>
          <DepartmentChips />
        </div>
      </section>

      {showJobs ? (
        <section className="section latest-section" aria-labelledby="latest-heading">
          <div className="container">
            <div className="section-head">
              <div>
                <h2 id="latest-heading">Latest Job Alerts</h2>
                <p className="section-sub">
                  Explore the latest pharmaceutical and life sciences job opportunities.
                </p>
              </div>
              <Link className="link-arrow" href="/jobs">
                View all jobs
                <ArrowRightIcon size={15} />
              </Link>
            </div>

            {demoCount > 0 ? <DemoNotice /> : null}

            {jobs.length > 0 ? (
              <div className="job-list">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No jobs published yet"
                description="New pharmaceutical and life-sciences vacancies will appear here once they are published. Please check back soon."
                actionLabel="Browse all jobs"
                actionHref="/jobs"
              />
            )}
          </div>
        </section>
      ) : null}

      {showArticles ? (
        <section className="articles-section" aria-labelledby="latest-articles-heading">
          <div className="container">
            <div className="section-head">
              <div>
                <h2 id="latest-articles-heading">Latest Pharma Career Articles</h2>
                <p className="section-sub">
                  Practical guidance for interviews, skills and career decisions in pharma
                  and life sciences.
                </p>
              </div>
              <Link className="link-arrow" href="/articles">
                View all articles
                <ArrowRightIcon size={15} />
              </Link>
            </div>

            {articles.length > 0 ? (
              <div className="article-grid">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No articles published yet"
                description="Career guides and editorial updates will appear here once the site owner publishes them."
                actionLabel="Browse all jobs"
                actionHref="/jobs"
              />
            )}
          </div>
        </section>
      ) : null}
    </>
  );
}
