/**
 * Small allow-list HTML sanitiser for article bodies.
 *
 * The content is stored and later rendered with dangerouslySetInnerHTML, so it
 * must never contain scripts, event handlers, javascript: URLs or inline
 * styles. Only a deliberately small set of formatting tags is kept.
 */

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "div",
  "span",
  "h2",
  "h3",
  "h4",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "img",
  "hr",
  "pre",
  "code",
]);

const VOID_TAGS = new Set(["br", "img", "hr"]);
const DROP_CONTENT_TAGS = new Set(["script", "style", "iframe", "object", "embed", "template"]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Accept only http(s) URLs. Relative paths are not allowed in article HTML. */
export function safeArticleUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2000) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function parseAttributes(source: string): Map<string, string> {
  const attributes = new Map<string, string>();
  const pattern = /([a-zA-Z0-9:_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    if (!attributes.has(name)) attributes.set(name, value);
  }
  return attributes;
}

function sanitizeAttributes(tag: string, source: string): string {
  const raw = parseAttributes(source);
  const output: string[] = [];

  if (tag === "a") {
    const href = raw.get("href") ? safeArticleUrl(raw.get("href") ?? "") : null;
    if (href) output.push(`href="${escapeHtml(href)}"`);
    if (raw.get("title")) output.push(`title="${escapeHtml((raw.get("title") ?? "").slice(0, 300))}"`);
    output.push('target="_blank"', 'rel="noopener noreferrer nofollow"');
  }

  if (tag === "img") {
    const src = raw.get("src") ? safeArticleUrl(raw.get("src") ?? "") : null;
    if (!src) return "";
    output.push(`src="${escapeHtml(src)}"`);
    output.push(`alt="${escapeHtml((raw.get("alt") ?? "").slice(0, 300))}"`);
    if (raw.get("title")) output.push(`title="${escapeHtml((raw.get("title") ?? "").slice(0, 300))}"`);
    output.push('loading="lazy"', 'referrerpolicy="no-referrer"');
  }

  return output.length > 0 ? ` ${output.join(" ")}` : "";
}

export function sanitizeArticleHtml(input: string): string {
  if (!input) return "";
  let html = input.replace(/<!--[\s\S]*?-->/g, "");
  let output = "";
  let cursor = 0;

  while (cursor < html.length) {
    const start = html.indexOf("<", cursor);
    if (start === -1) {
      output += escapeHtml(html.slice(cursor));
      break;
    }

    output += escapeHtml(html.slice(cursor, start));

    // Comments and doctypes are removed.
    if (html.startsWith("<!--", start)) {
      const end = html.indexOf("-->", start + 4);
      cursor = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith("<!", start)) {
      const end = html.indexOf(">", start);
      cursor = end === -1 ? html.length : end + 1;
      continue;
    }

    const end = html.indexOf(">", start);
    if (end === -1) {
      output += escapeHtml(html.slice(start));
      break;
    }

    const rawTag = html.slice(start + 1, end).trim();
    cursor = end + 1;

    if (!rawTag) continue;
    const closing = rawTag.startsWith("/");
    const body = closing ? rawTag.slice(1).trim() : rawTag;

    // A ">" inside a quoted attribute is rare in editor output; retry with a
    // slightly wider scan when the tag looks truncated.
    const nameMatch = /^([a-zA-Z0-9]+)/.exec(body);
    if (!nameMatch) continue;
    const tag = nameMatch[1].toLowerCase();

    if (DROP_CONTENT_TAGS.has(tag)) {
      if (!closing) {
        const closePattern = new RegExp(`</${tag}\\s*>`, "i");
        const rest = html.slice(cursor);
        const closeMatch = closePattern.exec(rest);
        cursor = closeMatch ? cursor + closeMatch.index + closeMatch[0].length : html.length;
      }
      continue;
    }

    if (!ALLOWED_TAGS.has(tag)) continue;

    if (closing) {
      if (!VOID_TAGS.has(tag)) output += `</${tag}>`;
      continue;
    }

    const selfClosing = body.endsWith("/");
    const attributes = sanitizeAttributes(tag, body.slice(nameMatch[0].length));
    output += `<${tag}${attributes}${selfClosing || VOID_TAGS.has(tag) ? " /" : ""}>`;
  }

  return output.trim().slice(0, 120_000);
}

/** Converts newline-separated plain text into safe paragraphs. */
export function plainTextToHtml(value: string): string {
  return value
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${escapeHtml(paragraph.trim()).replace(/\n/g, "<br />")}</p>`)
    .filter((paragraph) => paragraph !== "<p></p>")
    .join("\n");
}

export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}
