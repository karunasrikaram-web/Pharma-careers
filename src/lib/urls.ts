const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^172\.(1[6-9]|2\d|3[01])\./,
];

/**
 * Returns a normalised http(s) URL, or null when the value is not safe to use
 * as a public application link. Blocks non-http protocols, credentials in the
 * URL and obvious private-network hosts.
 */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2000) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (!url.hostname) return null;
    if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname))) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function slugify(value: string, fallback = "job"): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

  return slug || fallback;
}
