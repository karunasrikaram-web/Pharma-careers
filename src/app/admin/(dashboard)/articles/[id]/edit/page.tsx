import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminFlash } from "@/components/admin-flash";
import { ArticleEditor } from "@/components/article-editor";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ArrowLeftIcon } from "@/components/icons";
import {
  deleteArticleAction,
  setArticleStatusAction,
  toggleArticleFeaturedAction,
} from "@/actions/articles";
import { getArticleById, listCategories } from "@/lib/articles";
import { formatDateTime } from "@/lib/dates";
import { articleToFormValues } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit article" };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const query = await searchParams;
  const article = getArticleById(id);
  if (!article) notFound();

  const categories = listCategories("article");
  const scheduledFuture =
    article.status === "published" &&
    article.scheduled_at &&
    Date.parse(article.scheduled_at) > Date.now();

  return (
    <>
      <div className="admin-page-head">
        <div>
          <Link href="/admin/articles" className="link-arrow" style={{ marginBottom: 8 }}>
            <ArrowLeftIcon size={14} /> Back to articles
          </Link>
          <h1>Edit Article</h1>
          <p>
            {article.category_name ?? "Uncategorised"} · Last updated{" "}
            {formatDateTime(article.updated_at)}
          </p>
        </div>
        <div className="admin-actions">
          <span className={`status-badge status-${article.status}`}>{article.status}</span>
          <Link
            href={`/admin/articles/${article.id}/preview`}
            className="btn btn-secondary btn-sm"
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
              View public page
            </Link>
          ) : null}
        </div>
      </div>

      <AdminFlash saved={first(query.saved) === "1"} error={first(query.error) || undefined} />

      {scheduledFuture ? (
        <p className="notice notice-info">
          This article is scheduled for {formatDateTime(article.scheduled_at)} and is not
          publicly visible yet.
        </p>
      ) : null}

      <section className="admin-panel" aria-labelledby="article-controls-heading">
        <div className="admin-panel-head">
          <div>
            <h2 id="article-controls-heading">Publishing controls</h2>
            <p>Quick actions update public visibility immediately.</p>
          </div>
        </div>
        <div className="admin-panel-body">
          <div className="admin-actions">
            {article.status !== "published" ? (
              <form action={setArticleStatusAction}>
                <input type="hidden" name="id" value={article.id} />
                <input type="hidden" name="status" value="published" />
                <button className="btn btn-primary btn-sm" type="submit">
                  Publish article
                </button>
              </form>
            ) : (
              <form action={setArticleStatusAction}>
                <input type="hidden" name="id" value={article.id} />
                <input type="hidden" name="status" value="draft" />
                <button className="btn btn-secondary btn-sm" type="submit">
                  Unpublish to draft
                </button>
              </form>
            )}

            {article.status !== "archived" ? (
              <form action={setArticleStatusAction}>
                <input type="hidden" name="id" value={article.id} />
                <input type="hidden" name="status" value="archived" />
                <button className="btn btn-secondary btn-sm" type="submit">
                  Archive
                </button>
              </form>
            ) : null}

            <form action={toggleArticleFeaturedAction}>
              <input type="hidden" name="id" value={article.id} />
              <button className="btn btn-secondary btn-sm" type="submit">
                {article.is_featured ? "Remove featured" : "Mark featured"}
              </button>
            </form>

            <form action={deleteArticleAction} style={{ marginLeft: "auto" }}>
              <input type="hidden" name="id" value={article.id} />
              <ConfirmSubmitButton
                message={`Delete “${article.title}” permanently? This cannot be undone.`}
              >
                Delete article
              </ConfirmSubmitButton>
            </form>
          </div>
        </div>
      </section>

      <ArticleEditor initialValues={articleToFormValues(article)} categories={categories} />
    </>
  );
}
