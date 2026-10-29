import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div>
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              💊
            </span>
            Pharma Careers
          </Link>
          <p className="footer-blurb">
            Curated pharmaceutical and biotech careers — quality, production, R&amp;D, regulatory and
            clinical openings in one place.
          </p>
        </div>
        <div className="footer-links">
          <h3>Company</h3>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div className="footer-links">
          <h3>Legal</h3>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/disclaimer">Disclaimer</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        © {new Date().getFullYear()} Pharma Careers. All rights reserved.
      </div>
    </footer>
  );
}
