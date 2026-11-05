/**
 * Reviews storage backed by the existing `site_content` table (single JSON
 * document under key `reviews`). Avoids a new table migration while keeping
 * the same public/admin behaviour.
 *
 * Document shape:
 *   { reviews: Array<{ id, name, email, role, rating, content, status,
 *                      created_at, updated_at }> }
 */
import { getSupabaseAdmin } from "./db.js";

export interface StoredReview {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  rating: number;
  content: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}

const KEY = "reviews";

export async function readReviews(): Promise<StoredReview[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("site_content")
    .select("value")
    .eq("key", KEY)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const value = data?.value as { reviews?: StoredReview[] } | null;
  return Array.isArray(value?.reviews) ? value.reviews : [];
}

export async function writeReviews(reviews: StoredReview[]): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("site_content")
    .upsert(
      { key: KEY, value: { reviews }, type: "json", updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) throw new Error(error.message);
}