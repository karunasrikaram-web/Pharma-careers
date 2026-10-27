import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/icons";

interface PaginationProps {
  page: number;
  totalPages: number;
  params: Record<string, string | undefined>;
  basePath?: string;
}

function pageHref(
  params: Record<string, string | undefined>,
  page: number,
  basePath: string,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function Pagination({
  page,
  totalPages,
  params,
  basePath = "/jobs",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let index = start; index <= end; index += 1) pages.push(index);

  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 ? (
        <Link
          href={pageHref(params, page - 1, basePath)}
          className="page-link page-arrow"
          aria-label="Previous page"
        >
          <ArrowLeftIcon size={15} />
          <span>Previous</span>
        </Link>
      ) : (
        <span className="page-link page-arrow is-disabled" aria-hidden="true">
          <ArrowLeftIcon size={15} />
          <span>Previous</span>
        </span>
      )}

      <div className="page-numbers">
        {pages.map((pageNumber) => (
          <Link
            key={pageNumber}
            href={pageHref(params, pageNumber, basePath)}
            className={`page-number${pageNumber === page ? " is-current" : ""}`}
            aria-current={pageNumber === page ? "page" : undefined}
            aria-label={`Page ${pageNumber}`}
          >
            {pageNumber}
          </Link>
        ))}
      </div>

      {page < totalPages ? (
        <Link
          href={pageHref(params, page + 1, basePath)}
          className="page-link page-arrow"
          aria-label="Next page"
        >
          <span>Next</span>
          <ArrowRightIcon size={15} />
        </Link>
      ) : (
        <span className="page-link page-arrow is-disabled" aria-hidden="true">
          <span>Next</span>
          <ArrowRightIcon size={15} />
        </span>
      )}
    </nav>
  );
}
