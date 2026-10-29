import { AdminAuthProvider } from "./context/AdminAuthContext";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import AdminAccessDenied from "./pages/admin/AccessDenied";
import AdminShell from "./pages/admin/AdminShell";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminJobs from "./pages/admin/Jobs";
import AdminApplications from "./pages/admin/Applications";
import AdminLogin from "./pages/admin/Login";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import AllJobs from "./pages/AllJobs";
import JobDetail from "./pages/JobDetail";
import Apply from "./pages/Apply";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Disclaimer from "./pages/Disclaimer";

function PublicLayout() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <Routes>
        {/* public site */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/jobs" element={<AllJobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/apply" element={<Apply />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="*" element={<Home />} />
        </Route>

        {/* admin console — self-contained dark UI, no public chrome */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="jobs" element={<AdminJobs />} />
          <Route path="applications" element={<AdminApplications />} />
        </Route>
        <Route path="/admin/access-denied" element={<AdminAccessDenied />} />
      </Routes>
    </AdminAuthProvider>
  );
}
