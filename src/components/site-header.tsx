"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRightIcon, CloseIcon, MenuIcon } from "@/components/icons";
import { JobAlertsButton } from "@/components/job-alerts-popup";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/jobs", label: "All Jobs" },
  { href: "/articles", label: "Articles" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="Pharma Careers home">
          Pharma Careers
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="nav-link"
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
          <JobAlertsButton />
          <Link href="/jobs?sort=latest" className="btn-latest">
            Latest Jobs
            <ArrowRightIcon size={15} />
          </Link>
        </nav>

        <button
          type="button"
          className="mobile-menu-button"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </div>

      <div
        id="mobile-navigation"
        className={`mobile-nav${open ? " is-open" : ""}`}
        hidden={!open}
      >
        <nav className="container mobile-nav-inner" aria-label="Mobile navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="mobile-nav-link"
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <JobAlertsButton className="btn btn-secondary mobile-nav-cta" />
          <Link
            href="/jobs?sort=latest"
            className="btn btn-lime mobile-nav-cta"
            onClick={() => setOpen(false)}
            style={{ marginTop: 0 }}
          >
            Latest Jobs
            <ArrowRightIcon size={15} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
