import { NavLink, Link } from "react-router-dom";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/jobs", label: "All Jobs", end: false },
  { to: "/about", label: "About", end: false },
  { to: "/reviews", label: "Reviews", end: false },
  { to: "/contact", label: "Contact", end: false },
];

export default function Header() {
  return (
    <>
      <div className="topbar">
        <div className="container topbar-inner">
          <span className="topbar-claim">
            <span className="dot" aria-hidden="true" />
            Official Pharma Career Portal · Walk-in Drives &amp; Openings 2026
          </span>
          <span className="topbar-contact">
            <Link to="/jobs">Fresh openings added daily</Link>
            <Link to="/apply">Candidates apply free</Link>
          </span>
        </div>
      </div>
      <header className="site-header">
        <div className="container">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              💊
            </span>
            Pharma Careers
          </Link>
          <nav className="nav" aria-label="Main navigation">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "active" : undefined)}>
                {item.label}
              </NavLink>
            ))}
            <NavLink to="/apply" className={({ isActive }) => (isActive ? "nav-cta active" : "nav-cta")}>
              Apply
            </NavLink>
          </nav>
        </div>
      </header>
    </>
  );
}