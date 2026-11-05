import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-main">
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
        <nav className="footer-links" aria-label="Footer navigation">
          <Link to="/about">About</Link>
          <Link to="/reviews">Reviews</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/disclaimer">Disclaimer</Link>
        </nav>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Pharma Careers. All rights reserved.</span>
        <span>Connecting pharmaceutical talent with leading manufacturers &amp; research organizations.</span>
      </div>
    </footer>
  );
}