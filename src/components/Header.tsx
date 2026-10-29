import { NavLink, Link } from "react-router-dom";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/jobs", label: "All Jobs", end: false },
  { to: "/apply", label: "Apply", end: false },
  { to: "/about", label: "About", end: false },
  { to: "/contact", label: "Contact", end: false },
];

export default function Header() {
  return (
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
        </nav>
      </div>
    </header>
  );
}
