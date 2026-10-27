import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@/components/icons";
import { getArticleById } from "@/lib/articles";
import { formatDate } from "@/lib/dates";
import { safeArticleUrl, sanitizeArticleHtml } from "@/lib/sanitize";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Article preview",
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

export default async function ArticlePreviewPage({ params }: { params: Params }) {
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) notFound();

  const cover = safeArticleUrl(article.cover_image_url ?? "");
  const content = sanitizeArticleHtml(article.content);

  return (
    <>
      <div className="admin-page-head">
        <div>
          <Link href={`/admin/articles/${article.id}/edit`} className="link-arrow" style={{ marginBottom: 8 }}>
            <ArrowLeftIcon size={14} /> Back to editor
          </Link>
          <h1>Article Preview</h1>
          <p>Private preview. This page is only available to signed-in administrators.</p>
        </div>
        <div className="admin-actions">
          <span className={`status-badge status-${article.status}`}>{article.status}</span>
          <Link href={`/admin/articles/${article.id}/edit`} className="btn btn-primary btn-sm">
            Edit article
          </Link>
        </div>
      </div>

      <div className="preview-banner">
        <span>
          This is a preview, not the public article page. Only the administrator can see this
          view.
        </span>
      </div>

      <article className="article-preview-frame">
        <p className="eyebrow">{article.category_name ?? "CAREER ARTICLE"}</p>
        <h1 className="detail-title">{article.title}</h1>
        <p className="article-byline">
          <span>{article.author_name || "Pharma Careers Editorial Team"}</span>
          <span>{formatDate(article.published_at ?? article.scheduled_at)}</span>
        </p>
        {article.excerpt ? <p className="hero-sub" style={{ fontSize: 18 }}>{article.excerpt}</p> : null}
        {cover ? (
          <div className="article-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" referrerPolicy="no-referrer" />
          </div>
        ) : null}
        <div className="prose" dangerouslySetInnerHTML={{ __html: content }} />
      </article>
    </>
  );
}
