"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import {
  articleSlugExists,
  getArticleById,
  isArticleStatus,
} from "@/lib/articles";
import { requireAdmin } from "@/lib/session";
import { sanitizeArticleHtml, safeArticleUrl } from "@/lib/sanitize";
import {
  categorySchema,
  parseArticleForm,
  type ArticleFormValues,
} from "@/lib/validation";
import { slugify } from "@/lib/urls";
import type { ArticleStatus } from "@/lib/types";

export interface ArticleFormState {
  errors: Record<string, string>;
  values: ArticleFormValues;
  message?: string;
}

function uniqueSlug(title: string, excludeId?: string): string {
  const base = slugify(title) || "article";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${randomBytes(2).toString("hex")}`;
    const existing = getDb()
      .prepare("SELECT id FROM articles WHERE slug = ?")
      .get(candidate) as { id: string } | undefined;
    if (!existing || existing.id === excludeId) return candidate;
  }
  return `${base}-${randomUUID().slice(0, 8)}`;
}

function revalidateArticlePaths(slug?: string): void {
  revalidatePath("/");
  revalidatePath("/articles");
  if (slug) revalidatePath(`/articles/${slug}`);
  revalidatePath("/admin");
  revalidatePath("/admin/articles");
}

export async function saveArticleAction(
  _previousState: ArticleFormState,
  formData: FormData,
): Promise<ArticleFormState> {
  const session = await requireAdmin();
  const parsed = parseArticleForm(formData);

  if (!parsed.success) {
    return {
      errors: parsed.errors,
      values: parsed.values,
      message: "Please correct the highlighted fields.",
    };
  }

  const data = parsed.data;
  const values = parsed.values;
  const articleId = values.id.trim() || null;
  const db = getDb();
  const now = new Date().toISOString();
  const content = sanitizeArticleHtml(data.content);

  if (content.replace(/<[^>]*>/g, "").trim().length < 30) {
    return {
      errors: { content: "Write at least 30 characters of readable article content." },
      values,
      message: "The article content is too short.",
    };
  }

  let categoryId: string | null = data.category_id ?? null;
  if (categoryId) {
    const category = db
      .prepare("SELECT id FROM categories WHERE id = ? AND content_type = 'article'")
      .get(categoryId) as { id: string } | undefined;
    if (!category) categoryId = null;
  }

  let savedId = articleId;
  let savedSlug: string | undefined;

  try {
    if (articleId) {
      const existing = getArticleById(articleId);
      if (!existing) {
        return {
          errors: { form: "This article no longer exists." },
          values,
          message: "This article no longer exists.",
        };
      }

      const slug = data.slug?.trim()
        ? data.slug.trim()
        : uniqueSlug(data.title, articleId);
      if (slug !== existing.slug && articleSlugExists(slug)) {
        return {
          errors: { slug: "That URL slug is already used by another article." },
          values,
          message: "Choose a unique slug.",
        };
      }

      const publishedAt = resolvePublishedAt(data.status, data.scheduled_at, existing.published_at);
      db.prepare(
        `UPDATE articles SET
           title = ?, slug = ?, excerpt = ?, content = ?, cover_image_url = ?,
           category_id = ?, author_name = ?, tags = ?, seo_title = ?, seo_description = ?,
           status = ?, is_featured = ?, scheduled_at = ?, published_at = ?, updated_at = ?
         WHERE id = ?`,
      ).run(
        data.title,
        slug,
        data.excerpt ?? null,
        content,
        data.cover_image_url ? safeArticleUrl(data.cover_image_url) : null,
        categoryId,
        data.author_name ?? null,
        data.tags ?? null,
        data.seo_title ?? null,
        data.seo_description ?? null,
        data.status,
        data.is_featured ? 1 : 0,
        data.scheduled_at ? new Date(data.scheduled_at).toISOString() : null,
        publishedAt,
        now,
        articleId,
      );
      savedSlug = slug;
    } else {
      savedId = randomUUID();
      savedSlug = data.slug?.trim() || uniqueSlug(data.title);
      if (articleSlugExists(savedSlug)) {
        savedSlug = uniqueSlug(data.title);
      }
      const publishedAt = resolvePublishedAt(data.status, data.scheduled_at, null);

      db.prepare(
        `INSERT INTO articles (
           id, title, slug, excerpt, content, cover_image_url, category_id,
           author_name, tags, seo_title, seo_description, status, is_featured,
           is_demo, scheduled_at, published_at, created_by, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
      ).run(
        savedId,
        data.title,
        savedSlug,
        data.excerpt ?? null,
        content,
        data.cover_image_url ? safeArticleUrl(data.cover_image_url) : null,
        categoryId,
        data.author_name ?? null,
        data.tags ?? null,
        data.seo_title ?? null,
        data.seo_description ?? null,
        data.status,
        data.is_featured ? 1 : 0,
        data.scheduled_at ? new Date(data.scheduled_at).toISOString() : null,
        publishedAt,
        session.id,
        now,
        now,
      );
    }
  } catch (error) {
    console.error("Failed to save article.", error);
    return {
      errors: { form: "The article could not be saved. Please try again." },
      values,
      message: "The article could not be saved.",
    };
  }

  if (!savedId) {
    return {
      errors: { form: "The article could not be saved." },
      values,
      message: "The article could not be saved.",
    };
  }

  revalidateArticlePaths(savedSlug);

  if (values.intent === "preview") {
    redirect(`/admin/articles/${savedId}/preview`);
  }

  redirect(`/admin/articles/${savedId}/edit?saved=1`);
}

function resolvePublishedAt(
  status: ArticleStatus,
  scheduledAt: string | undefined,
  existing: string | null,
): string | null {
  if (status !== "published") return existing;
  if (scheduledAt) {
    const scheduled = new Date(scheduledAt);
    if (!Number.isNaN(scheduled.getTime())) return scheduled.toISOString();
  }
  return existing ?? new Date().toISOString();
}

export async function setArticleStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !isArticleStatus(status)) redirect("/admin/articles?error=invalid");

  const article = getArticleById(id);
  if (!article) redirect("/admin/articles?error=not-found");

  try {
    const now = new Date().toISOString();
    const publishedAt =
      status === "published" ? article.published_at ?? now : article.published_at;
    getDb()
      .prepare(
        "UPDATE articles SET status = ?, published_at = ?, scheduled_at = ?, updated_at = ? WHERE id = ?",
      )
      .run(status, publishedAt, status === "published" ? article.scheduled_at : null, now, id);
  } catch (error) {
    console.error("Failed to update article status.", error);
    redirect(`/admin/articles/${id}/edit?error=status`);
  }

  revalidateArticlePaths(article.slug);
  redirect(`/admin/articles/${id}/edit?saved=1`);
}

export async function toggleArticleFeaturedAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/articles?error=invalid");
  const article = getArticleById(id);
  if (!article) redirect("/admin/articles?error=not-found");

  try {
    getDb()
      .prepare("UPDATE articles SET is_featured = ?, updated_at = ? WHERE id = ?")
      .run(article.is_featured ? 0 : 1, new Date().toISOString(), id);
  } catch (error) {
    console.error("Failed to toggle article featured status.", error);
    redirect(`/admin/articles/${id}/edit?error=status`);
  }

  revalidateArticlePaths(article.slug);
  redirect(`/admin/articles/${id}/edit?saved=1`);
}

export async function deleteArticleAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/articles?error=invalid");
  const article = getArticleById(id);
  if (!article) redirect("/admin/articles?error=not-found");

  try {
    getDb().prepare("DELETE FROM articles WHERE id = ?").run(id);
  } catch (error) {
    console.error("Failed to delete article.", error);
    redirect(`/admin/articles/${id}/edit?error=delete`);
  }

  revalidateArticlePaths(article.slug);
  redirect("/admin/articles?deleted=1");
}

export async function createCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    content_type: "article",
  });
  if (!parsed.success) redirect("/admin/categories?error=invalid");

  try {
    const db = getDb();
    const slug = slugify(parsed.data.name);
    const exists = db
      .prepare("SELECT 1 FROM categories WHERE slug = ? AND content_type = 'article'")
      .get(slug);
    if (exists) redirect("/admin/categories?error=duplicate");
    db.prepare(
      "INSERT INTO categories (id, name, slug, content_type, created_at) VALUES (?, ?, ?, 'article', ?)",
    ).run(randomUUID(), parsed.data.name, slug, new Date().toISOString());
  } catch (error) {
    console.error("Failed to create category.", error);
    redirect("/admin/categories?error=create");
  }

  revalidatePath("/admin/categories");
  revalidatePath("/articles");
  redirect("/admin/categories?created=1");
}

export async function renameCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!id || name.length < 2 || name.length > 100) redirect("/admin/categories?error=invalid");

  try {
    getDb()
      .prepare("UPDATE categories SET name = ?, slug = ? WHERE id = ?")
      .run(name, slugify(name), id);
  } catch (error) {
    console.error("Failed to rename category.", error);
    redirect("/admin/categories?error=update");
  }

  revalidatePath("/admin/categories");
  revalidatePath("/articles");
  redirect("/admin/categories?updated=1");
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/categories?error=invalid");

  try {
    getDb().prepare("DELETE FROM categories WHERE id = ?").run(id);
  } catch (error) {
    console.error("Failed to delete category.", error);
    redirect("/admin/categories?error=delete");
  }

  revalidatePath("/admin/categories");
  revalidatePath("/articles");
  redirect("/admin/categories?deleted=1");
}
