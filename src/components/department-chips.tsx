import Link from "next/link";
import { CloseIcon } from "@/components/icons";
import { DEPARTMENTS } from "@/lib/constants";

interface DepartmentChipsProps {
  activeDepartment?: string;
  basePath?: string;
  preserve?: Record<string, string | undefined>;
}

function buildHref(
  basePath: string,
  department: string,
  preserve?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(preserve ?? {})) {
    if (value) params.set(key, value);
  }
  params.set("department", department);
  return `${basePath}?${params.toString()}`;
}

export function DepartmentChips({
  activeDepartment,
  basePath = "/jobs",
  preserve,
}: DepartmentChipsProps) {
  return (
    <div className="chips">
      {DEPARTMENTS.map((department) => {
        const active = activeDepartment === department;
        return (
          <Link
            key={department}
            href={active ? basePath : buildHref(basePath, department, preserve)}
            className={`chip${active ? " is-active" : ""}`}
            aria-current={active ? "true" : undefined}
          >
            {department}
            {active ? <CloseIcon size={13} /> : null}
          </Link>
        );
      })}
      {activeDepartment ? (
        <Link href={basePath} className="chip-reset">
          Clear department
        </Link>
      ) : null}
    </div>
  );
}
