import { getDb } from "@/lib/db";
import type {
  Article,
  ArticleFilters,
  ArticleStats,
  ArticleStatus,
  Category,
  PaginatedArticles,
} from "@/lib/types";

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const PUBLIC_CONDITION =
  "a.status = 'published' AND (a.scheduled_at IS NULL OR a.scheduled_at <= ?) AND (a.published_at IS NULL OR a.published_at <= ?)";

const ARTICLE_SELECT = `SELECT a.*, c.name AS category_name, c.slug AS category_slug
  FROM articles a
  LEFT JOIN categories c ON c.id = a.category_id`;

export function listCategories(contentType: "article" | "job" = "article"): Category[] {
  return getDb()
    .prepare("SELECT * FROM categories WHERE content_type = ? ORDER BY name COLLATE NOCASE")
    .all(contentType) as Category[];
}

export function getCategoryById(id: string): Category | null {
  return (
    (getDb().prepare("SELECT * FROM categories WHERE id = ?").get(id) as Category | undefined) ??
    null
  );
}

export function listPublicArticles(filters: ArticleFilters = {}): PaginatedArticles {
  const db = getDb();
  const now = new Date().toISOString();
  const perPage = clamp(filters.perPage ?? 9, 1, 50);
  const requestedPage = Math.max(1, Math.floor(filters.page ?? 1));
  const clauses = [PUBLIC_CONDITION];
  const params: Array<string | number> = [now, now];

  const q = filters.q?.trim().slice(0, 120);
  if (q) {
    const like = `%${escapeLike(q)}%`;
    clauses.push(
      "(a.title LIKE ? ESCAPE '\\' OR a.excerpt LIKE ? ESCAPE '\\' OR a.content LIKE ? ESCAPE '\\' OR a.tags LIKE ? ESCAPE '\\')",
    );
    params.push(like, like, like, like);
  }

  if (filters.category?.trim()) {
    clauses.push("c.slug = ?");
    params.push(filters.category.trim().slice(0, 120));
  }

  const where = clauses.join(" AND ");
  const countRow = db
    .prepare(
      `SELECT COUNT(*) AS count FROM articles a LEFT JOIN categories c ON c.id = a.category_id WHERE ${where}`,
    )
    .get(...params) as { count: number };

  const total = countRow.count;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(requestedPage, totalPages);

  const articles = db
    .prepare(
      `${ARTICLE_SELECT} WHERE ${where}
       ORDER BY a.is_featured DESC, COALESCE(a.published_at, a.scheduled_at) DESC, a.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, perPage, (page - 1) * perPage) as Article[];

  return { articles, total, page, perPage, totalPages };
}

export function getLatestPublicArticles(limit = 3): Article[] {
  const now = new Date().toISOString();
  return getDb()
    .prepare(
      `${ARTICLE_SELECT} WHERE ${PUBLIC_CONDITION}
       ORDER BY a.is_featured DESC, COALESCE(a.published_at, a.scheduled_at) DESC, a.created_at DESC
       LIMIT ?`,
    )
    .all(now, now, clamp(limit, 1, 24)) as Article[];
}

export function getPublicArticleBySlug(slug: string): Article | null {
  const now = new Date().toISOString();
  const article = getDb()
    .prepare(`${ARTICLE_SELECT} WHERE a.slug = ? AND ${PUBLIC_CONDITION}`)
    .get(slug, now, now) as Article | undefined;
  return article ?? null;
}

export function getArticleById(id: string): Article | null {
  return (
    (getDb().prepare(`${ARTICLE_SELECT} WHERE a.id = ?`).get(id) as Article | undefined) ?? null
  );
}

export function getRelatedArticles(article: Article, limit = 3): Article[] {
  const now = new Date().toISOString();
  return getDb()
    .prepare(
      `${ARTICLE_SELECT} WHERE ${PUBLIC_CONDITION} AND a.id != ?
       ORDER BY (CASE WHEN a.category_id = ? THEN 0 ELSE 1 END), a.published_at DESC, a.created_at DESC
       LIMIT ?`,
    )
    .all(now, now, article.id, article.category_id, clamp(limit, 1, 12)) as Article[];
}

export function listAdminArticles(filters: ArticleFilters = {}): Article[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: string[] = [];

  const q = filters.q?.trim().slice(0, 120);
  if (q) {
    const like = `%${escapeLike(q)}%`;
    clauses.push(
      "(a.title LIKE ? ESCAPE '\\' OR a.excerpt LIKE ? ESCAPE '\\' OR a.author_name LIKE ? ESCAPE '\\')",
    );
    params.push(like, like, like);
  }

  if (filters.status && ["draft", "published", "archived"].includes(filters.status)) {
    clauses.push("a.status = ?");
    params.push(filters.status);
  }

  if (filters.category) {
    clauses.push("c.slug = ?");
    params.push(filters.category);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  return db
    .prepare(`${ARTICLE_SELECT} ${where} ORDER BY a.updated_at DESC`)
    .all(...params) as Article[];
}

export function getArticleStats(): ArticleStats {
  const now = new Date().toISOString();
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'published' AND (scheduled_at IS NULL OR scheduled_at <= ?) THEN 1 ELSE 0 END) AS published,
              SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts,
              SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) AS archived,
              SUM(CASE WHEN status = 'published' AND scheduled_at IS NOT NULL AND scheduled_at > ? THEN 1 ELSE 0 END) AS scheduled
       FROM articles`,
    )
    .get(now, now) as {
    total: number;
    published: number | null;
    drafts: number | null;
    archived: number | null;
    scheduled: number | null;
  };
  return {
    total: row.total,
    published: row.published ?? 0,
    drafts: row.drafts ?? 0,
    archived: row.archived ?? 0,
    scheduled: row.scheduled ?? 0,
  };
}

export function articleSlugExists(slug: string): boolean {
  return Boolean(getDb().prepare("SELECT 1 FROM articles WHERE slug = ?").get(slug));
}

export function isArticleStatus(value: string): value is ArticleStatus {
  return value === "draft" || value === "published" || value === "archived";
}
