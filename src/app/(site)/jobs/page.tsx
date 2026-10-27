import type { Metadata } from "next";
import Link from "next/link";
import { DemoNotice } from "@/components/demo-notice";
import { DepartmentChips } from "@/components/department-chips";
import { EmptyState } from "@/components/empty-state";
import { JobCard } from "@/components/job-card";
import { Pagination } from "@/components/pagination";
import { SearchPanel } from "@/components/search-panel";
import { countPublicDemoJobs, listPublicJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All Jobs",
  description:
    "Browse pharmaceutical, biotechnology, clinical research, manufacturing and life-sciences jobs across India.",
  alternates: { canonical: "/jobs" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function buildJobsHref(values: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `/jobs?${query}` : "/jobs";
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = first(params.q).trim().slice(0, 120);
  const location = first(params.location).trim().slice(0, 80);
  const department = first(params.department).trim().slice(0, 80);
  const sort = first(params.sort).trim() === "latest" ? "latest" : "";
  const requestedPage = Number.parseInt(first(params.page), 10);

  const result = await listPublicJobs({
    q,
    location,
    department,
    sort: sort === "latest" ? "latest" : undefined,
    page: Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    perPage: 9,
  });

  const demoCount = await countPublicDemoJobs();
  const hasFilters = Boolean(q || location || department);
  const resultLabel = `${result.total} job${result.total === 1 ? "" : "s"} found`;
  const sortHref =
    sort === "latest"
      ? buildJobsHref({ q, location, department })
      : buildJobsHref({ q, location, department, sort: "latest" });

  return (
    <div className="page-shell">
      <section className="page-heading">
        <div className="container">
          <p className="eyebrow">JOB DIRECTORY</p>
          <h1>All Jobs</h1>
          <p className="page-sub">
            Search pharmaceutical and life-sciences roles across India by keyword,
            department and location.
          </p>
          <SearchPanel
            idPrefix="jobs"
            q={q}
            location={location}
            showReset={hasFilters}
            resetHref="/jobs"
          />
        </div>
      </section>

      <section className="section departments-section" aria-labelledby="jobs-departments">
        <div className="container">
          <h2 className="section-title-sm" id="jobs-departments">
            Browse by department
          </h2>
          <DepartmentChips
            activeDepartment={department || undefined}
            preserve={{ q, location, sort }}
          />
        </div>
      </section>

      <section className="section jobs-results" aria-labelledby="results-heading">
        <div className="container">
          <div className="results-head">
            <div>
              <h2 id="results-heading" className="sr-only">
                Job results
              </h2>
              <p className="results-count" role="status">
                {resultLabel}
              </p>
              {hasFilters ? (
                <p className="results-filters">
                  {q ? <>Keyword: “{q}” </> : null}
                  {location ? <>Location: “{location}” </> : null}
                  {department ? <>Department: “{department}” </> : null}
                  <Link href="/jobs" className="inline-reset">
                    Clear all
                  </Link>
                </p>
              ) : null}
            </div>
            <Link className="link-arrow" href={sortHref}>
              {sort === "latest" ? "Featured first" : "Latest first"}
            </Link>
          </div>

          {demoCount > 0 ? <DemoNotice /> : null}

          {result.jobs.length > 0 ? (
            <>
              <div className="job-list">
                {result.jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                params={{ q, location, department, sort }}
              />
            </>
          ) : hasFilters ? (
            <EmptyState
              title="No jobs match your search"
              description="Try a different keyword or location, or clear your filters to see every published vacancy."
              actionLabel="Clear all filters"
              actionHref="/jobs"
              secondaryLabel="Back to home"
              secondaryHref="/"
            />
          ) : (
            <EmptyState
              title="No jobs published yet"
              description="New pharmaceutical and life-sciences vacancies will appear here once they are published. Please check back soon."
              actionLabel="Back to home"
              actionHref="/"
            />
          )}
        </div>
      </section>
    </div>
  );
}
