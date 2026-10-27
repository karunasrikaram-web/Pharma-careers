"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileIcon,
  LayoutIcon,
  EyeIcon,
  MailIcon,
  SettingsIcon,
  StarIcon,
  PlusIcon,
  BriefcaseIcon,
  UsersIcon,
} from "@/components/admin-icons";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutIcon, group: "Overview" },
  { href: "/admin/jobs", label: "Manage Jobs", icon: BriefcaseIcon, group: "Jobs" },
  { href: "/admin/jobs/new", label: "Create Job", icon: PlusIcon, group: "Jobs" },
  { href: "/admin/articles", label: "Manage Articles", icon: FileIcon, group: "Articles" },
  { href: "/admin/articles/new", label: "Create Article", icon: PlusIcon, group: "Articles" },
  { href: "/admin/user-details", label: "User Details", icon: UsersIcon, group: "Audience" },
  { href: "/admin/job-alerts", label: "Job Alerts", icon: MailIcon, group: "Publishing" },
  { href: "/admin/categories", label: "Categories", icon: StarIcon, group: "Publishing" },
  { href: "/admin/settings", label: "Settings", icon: SettingsIcon, group: "Account" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";

  if (href === "/admin/jobs") {
    return (
      pathname === "/admin/jobs" ||
      (pathname.startsWith("/admin/jobs/") && !pathname.endsWith("/new"))
    );
  }
  if (href === "/admin/articles") {
    return (
      pathname === "/admin/articles" ||
      (pathname.startsWith("/admin/articles/") && !pathname.endsWith("/new"))
    );
  }
  if (href === "/admin/user-details") {
    return (
      pathname === "/admin/user-details" || pathname.startsWith("/admin/user-details/")
    );
  }
  return pathname === href;
}

export function AdminNav() {
  const pathname = usePathname();
  let lastGroup = "";

  return (
    <nav className="admin-nav" aria-label="Administration">
      {LINKS.map((link) => {
        const showGroup = link.group !== lastGroup;
        lastGroup = link.group;
        const Icon = link.icon;
        return (
          <div key={link.href} style={{ display: "contents" }}>
            {showGroup ? <p className="admin-nav-group">{link.group}</p> : null}
            <Link
              href={link.href}
              className="admin-nav-link"
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
            >
              <Icon size={15} />
              {link.label}
            </Link>
          </div>
        );
      })}
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="admin-nav-link"
        style={{ marginTop: 6 }}
      >
        <EyeIcon size={15} />
        View Public Website
      </a>
    </nav>
  );
}
