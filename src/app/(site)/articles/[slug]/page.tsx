import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, CalendarIcon, UserIcon } from "@/components/icons";
import { ArticleCard } from "@/components/article-card";
import { ArticleShare } from "@/components/article-share";
import { formatDate } from "@/lib/dates";
import { getPublicArticleBySlug, getRelatedArticles } from "@/lib/articles";
import { sanitizeArticleHtml, safeArticleUrl } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const article = getPublicArticleBySlug(slug);
  if (!article) {
    return { title: "Article not found", robots: { index: false, follow: false } };
  }
  const title = article.seo_title || article.title;
  const description =
    article.seo_description ||
    article.excerpt ||
    `${article.title} — practical career guidance from Pharma Careers.`;

  return {
    title,
    description,
    alternates: { canonical: `/articles/${article.slug}` },
    robots: article.is_demo
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/articles/${article.slug}`,
      publishedTime: article.published_at ?? undefined,
      authors: article.author_name ? [article.author_name] : undefined,
      images: safeArticleUrl(article.cover_image_url ?? "") ?? undefined,
    },
  };
}

export default async function ArticleDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const article = getPublicArticleBySlug(slug);
  if (!article) notFound();

  const related = getRelatedArticles(article, 3);
  const cover = safeArticleUrl(article.cover_image_url ?? "");
  const content = sanitizeArticleHtml(article.content);
  const published = article.published_at ?? article.scheduled_at;
  const tags = (article.tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);

  return (
    <div className="article-detail">
      <div className="container">
        <Link href="/articles" className="link-arrow" style={{ marginBottom: 20 }}>
          <ArrowLeftIcon size={15} /> Back to Articles
        </Link>

        <header className="article-detail-head">
          <p className="eyebrow">{article.category_name ?? "CAREER ARTICLE"}</p>
          <h1>{article.title}</h1>
          {article.excerpt ? <p className="hero-sub" style={{ fontSize: 18 }}>{article.excerpt}</p> : null}
          <div className="article-byline">
            <span>
              <UserIcon size={14} /> {article.author_name || "Pharma Careers Editorial Team"}
            </span>
            <span>
              <CalendarIcon size={14} /> {formatDate(published)}
            </span>
          </div>
        </header>

        {cover ? (
          <div className="article-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" referrerPolicy="no-referrer" />
          </div>
        ) : null}

        <div className="article-layout">
          <div>
            <article className="prose" dangerouslySetInnerHTML={{ __html: content }} />
            <ArticleShare title={article.title} />
            <p className="article-disclaimer">
              This is editorial content from Pharma Careers, not a verified official
              announcement from a pharmaceutical company unless the article explicitly says
              otherwise. Always confirm company-specific details with the official source.
            </p>
            {article.is_demo ? (
              <p className="article-demo-note">
                This is a sample article supplied with the demonstration database. It is
                labelled so it cannot be mistaken for live company news.
              </p>
            ) : null}
          </div>

          <aside className="article-side" aria-label="Article information">
            <h2>Article details</h2>
            <p className="article-disclaimer" style={{ marginBottom: 14 }}>
              {article.category_name ?? "Pharma Careers"}
            </p>
            {tags.length > 0 ? (
              <>
                <h2>Tags</h2>
                <div className="tag-list">
                  {tags.map((tag) => (
                    <span key={tag} className="tag-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
            <p className="article-disclaimer">
              Pharma Careers publishes practical career information and editorial updates.
              It is not a recruitment agency and does not guarantee employment outcomes.
            </p>
            <Link href="/jobs" className="btn btn-secondary btn-sm" style={{ marginTop: 14 }}>
              Browse jobs
            </Link>
          </aside>
        </div>

        {related.length > 0 ? (
          <section className="related-section" aria-labelledby="related-heading">
            <h2 id="related-heading">Related articles</h2>
            <div className="article-grid">
              {related.map((item) => (
                <ArticleCard key={item.id} article={item} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
