import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
      <h1 style={{ fontSize: 40, margin: 0 }}>Pharma Careers</h1>
      <p style={{ color: "#9aa7bd", maxWidth: 560, textAlign: "center" }}>
        Curated biotech &amp; pharmaceutical career content — job postings, articles, site content and
        candidate viewing leads.
      </p>
      <Link to="/admin/login">Admin sign in</Link>
    </div>
  );
}
