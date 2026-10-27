import Link from "next/link";
import { ArrowRightIcon, CalendarIcon } from "@/components/icons";
import { formatDate } from "@/lib/dates";
import { safeArticleUrl } from "@/lib/sanitize";
import type { Article } from "@/lib/types";

export function ArticleCard({ article }: { article: Article }) {
  const cover = safeArticleUrl(article.cover_image_url ?? "");
  const category = article.category_name ?? "Pharma Careers";
  const published = article.published_at ?? article.scheduled_at;

  return (
    <article className="article-card">
      <Link
        href={`/articles/${article.slug}`}
        className="article-card-cover"
        tabIndex={-1}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span className="article-card-cover-placeholder" aria-hidden="true">Pharma Careers</span>
        )}
        <span className="sr-only">{article.title}</span>
      </Link>
      <div className="article-card-body">
        <div className="article-card-meta">
          <span className="article-category">{category}</span>
          <span aria-hidden="true">•</span>
          <span>
            <CalendarIcon size={12} /> {formatDate(published)}
          </span>
        </div>
        <h3>
          <Link href={`/articles/${article.slug}`}>{article.title}</Link>
        </h3>
        {article.excerpt ? <p className="article-card-excerpt">{article.excerpt}</p> : null}
        <div className="article-card-foot">
          <span>{article.author_name || "Pharma Careers Editorial Team"}</span>
          <Link href={`/articles/${article.slug}`} className="view-link">
            Read Article <ArrowRightIcon size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
