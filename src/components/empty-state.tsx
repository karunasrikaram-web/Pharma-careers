import Link from "next/link";
import { SearchIcon } from "@/components/icons";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  secondaryLabel,
  secondaryHref,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true">
        <SearchIcon size={24} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="empty-actions">
        {actionLabel && actionHref ? (
          <Link className="btn btn-primary" href={actionHref}>
            {actionLabel}
          </Link>
        ) : null}
        {secondaryLabel && secondaryHref ? (
          <Link className="btn btn-secondary" href={secondaryHref}>
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
