import Link from "next/link";
import type { Metadata } from "next";
import { AdminEmpty, AdminFlash } from "@/components/admin-flash";
import { PlusIcon } from "@/components/admin-icons";
import { listAdminArticles, listCategories } from "@/lib/articles";
import { formatDate, formatDateTime } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Manage articles" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AdminArticlesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = first(params.q).trim().slice(0, 120);
  const status = first(params.status).trim();
  const category = first(params.category).trim();
  const articles = listAdminArticles({ q, status, category });
  const categories = listCategories("article");

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>Manage Articles</h1>
          <p>Write, preview, publish and archive editorial content.</p>
        </div>
        <div className="admin-actions">
          <Link href="/admin/articles/new" className="btn btn-primary btn-sm">
            <PlusIcon size={14} /> Create Article
          </Link>
        </div>
      </div>

      <AdminFlash
        saved={first(params.saved) === "1"}
        deleted={first(params.deleted) === "1"}
        error={first(params.error) || undefined}
      />

      <section className="admin-panel" aria-labelledby="articles-table-heading">
        <div className="admin-panel-head">
          <div>
            <h2 id="articles-table-heading">All article records</h2>
            <p>{articles.length} record{articles.length === 1 ? "" : "s"} shown.</p>
          </div>
        </div>

        <form className="admin-filter-bar" action="/admin/articles" method="get" role="search">
          <label className="sr-only" htmlFor="admin-article-search">
            Search articles
          </label>
          <input
            className="input"
            id="admin-article-search"
            name="q"
            type="search"
            placeholder="Search title, excerpt, author…"
            defaultValue={q}
          />
          <select className="select" name="status" defaultValue={status} aria-label="Status">
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <select className="select" name="category" defaultValue={category} aria-label="Category">
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary btn-sm" type="submit">
            Filter
          </button>
          {q || status || category ? (
            <Link href="/admin/articles" className="btn btn-ghost btn-sm">
              Clear
            </Link>
          ) : null}
        </form>

        {articles.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Published / scheduled</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => {
                  const scheduledFuture =
                    article.status === "published" &&
                    article.scheduled_at &&
                    Date.parse(article.scheduled_at) > Date.now();
                  return (
                    <tr key={article.id}>
                      <td>
                        <div className="admin-table-title">
                          <Link href={`/admin/articles/${article.id}/edit`}>
                            {article.title}
                          </Link>
                        </div>
                        <p className="admin-table-sub">
                          {article.author_name || "No author"}
                          {article.is_featured ? " · Featured" : ""}
                          {article.is_demo ? " · Demo" : ""}
                        </p>
                      </td>
                      <td>{article.category_name ?? "Uncategorised"}</td>
                      <td>
                        <span className={`status-badge status-${article.status}`}>
                          {article.status}
                        </span>
                      </td>
                      <td>
                        {scheduledFuture
                          ? `Scheduled ${formatDateTime(article.scheduled_at)}`
                          : article.published_at
                            ? formatDate(article.published_at)
                            : "—"}
                      </td>
                      <td>{formatDate(article.updated_at)}</td>
                      <td>
                        <div className="admin-table-actions">
                          <Link
                            href={`/admin/articles/${article.id}/edit`}
                            className="btn btn-secondary btn-sm"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/admin/articles/${article.id}/preview`}
                            className="btn btn-ghost btn-sm"
                          >
                            Preview
                          </Link>
                          {article.status === "published" && !scheduledFuture ? (
                            <Link
                              href={`/articles/${article.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-sm"
                            >
                              View
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmpty
            title={q || status || category ? "No matching articles" : "No articles yet"}
            description={
              q || status || category
                ? "Try a different search term, status or category."
                : "Create your first article. Drafts remain private until published."
            }
            actionHref={q || status || category ? "/admin/articles" : "/admin/articles/new"}
            actionLabel={q || status || category ? "Clear filters" : "Create Article"}
          />
        )}
      </section>
    </>
  );
}
