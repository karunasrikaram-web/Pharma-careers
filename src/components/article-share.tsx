"use client";

import { useEffect, useState } from "react";

export function ArticleShare({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="article-share" aria-label="Share this article">
      <span>Share:</span>
      <a
        className="share-button"
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!url}
      >
        X / Twitter
      </a>
      <a
        className="share-button"
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!url}
      >
        LinkedIn
      </a>
      <a
        className="share-button"
        href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!url}
      >
        WhatsApp
      </a>
      <button type="button" className="share-button" onClick={copyLink}>
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
