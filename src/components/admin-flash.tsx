import Link from "next/link";

interface AdminFlashProps {
  saved?: boolean;
  created?: boolean;
  updated?: boolean;
  deleted?: boolean;
  error?: string;
  successMessage?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "The request was invalid. Please check the details and try again.",
  duplicate: "An item with that name already exists.",
  create: "The item could not be created. Please try again.",
  update: "The change could not be saved. Please try again.",
  delete: "The item could not be deleted. Please try again.",
  status: "The status could not be updated. Please try again.",
  "not-found": "The requested item could not be found.",
};

export function AdminFlash({
  saved,
  created,
  updated,
  deleted,
  error,
  successMessage,
}: AdminFlashProps) {
  if (error) {
    return (
      <p className="notice notice-error" role="alert">
        {ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."}
      </p>
    );
  }
  if (created || updated || deleted || saved) {
    return (
      <p className="notice notice-success" role="status">
        {successMessage ??
          (created
            ? "Created successfully."
            : deleted
              ? "Deleted successfully."
              : "Changes saved successfully.")}
      </p>
    );
  }
  return null;
}

export function AdminEmpty({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="admin-empty">
      <strong>{title}</strong>
      <p>{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
