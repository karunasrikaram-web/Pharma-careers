import type { Metadata } from "next";
import Link from "next/link";
import { ArticleCard } from "@/components/article-card";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { SearchIcon } from "@/components/icons";
import { listCategories, listPublicArticles } from "@/lib/articles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pharma Career Articles",
  description:
    "Practical pharma career guides, interview preparation advice and editorial updates for life-sciences professionals in India.",
  alternates: { canonical: "/articles" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function articlesHref(q: string, category?: string): string {
  const search = new URLSearchParams();
  if (q) search.set("q", q);
  if (category) search.set("category", category);
  const query = search.toString();
  return query ? `/articles?${query}` : "/articles";
}

export default async function ArticlesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = first(params.q).trim().slice(0, 120);
  const category = first(params.category).trim().slice(0, 120);
  const requestedPage = Number.parseInt(first(params.page), 10);

  const result = await listPublicArticles({
    q,
    category: category || undefined,
    page: Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    perPage: 9,
  });
  const categories = await listCategories("article");
  const hasFilters = Boolean(q || category);
  const activeCategory = categories.find((item) => item.slug === category);

  return (
    <div className="page-shell">
      <section className="page-head">
        <div className="container">
          <p className="eyebrow">CAREER RESOURCES</p>
          <h1>Pharma Career Articles</h1>
          <p>
            Practical guides, interview preparation and editorial updates for pharmaceutical
            and life-sciences professionals.
          </p>
        </div>
      </section>

      <section className="articles-section" aria-labelledby="articles-results-heading">
        <div className="container">
          <h2 id="articles-results-heading" className="sr-only">
            Article results
          </h2>

          <div className="article-filters">
            <form className="article-search" action="/articles" method="get" role="search">
              <label className="sr-only" htmlFor="article-search-input">
                Search articles
              </label>
              <input
                className="input"
                id="article-search-input"
                name="q"
                type="search"
                placeholder="Search articles by title or keyword"
                defaultValue={q}
              />
              {category ? <input type="hidden" name="category" value={category} /> : null}
              <button className="btn btn-primary" type="submit">
                <SearchIcon size={16} />
                Search
              </button>
            </form>
            <Link href={articlesHref(q)} className={`chip${!category ? " is-active" : ""}`}>
              All categories
            </Link>
          </div>

          <div className="chips" aria-label="Filter articles by category">
            {categories.map((item) => (
              <Link
                key={item.id}
                href={
                  item.slug === category
                    ? articlesHref(q)
                    : articlesHref(q, item.slug)
                }
                className={`chip${item.slug === category ? " is-active" : ""}`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="results-summary">
            <p role="status">
              {result.total} article{result.total === 1 ? "" : "s"} found
              {activeCategory ? ` in ${activeCategory.name}` : ""}
              {q ? ` for “${q}”` : ""}
            </p>
            {hasFilters ? (
              <Link href="/articles" className="link-arrow">
                Clear filters
              </Link>
            ) : null}
          </div>

          {result.articles.length > 0 ? (
            <>
              <div className="article-grid">
                {result.articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                params={{ q, category }}
                basePath="/articles"
              />
            </>
          ) : hasFilters ? (
            <EmptyState
              title="No articles match your search"
              description="Try another keyword or choose a different category. Only published articles are shown."
              actionLabel="Clear filters"
              actionHref="/articles"
            />
          ) : (
            <EmptyState
              title="No articles published yet"
              description="Career guides and editorial updates will appear here once the site owner publishes them."
              actionLabel="Browse jobs"
              actionHref="/jobs"
            />
          )}
        </div>
      </section>
    </div>
  );
}
