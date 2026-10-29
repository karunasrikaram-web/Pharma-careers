import { AdminAuthProvider } from "./context/AdminAuthContext";
import { Route, Routes } from "react-router-dom";
import AdminAccessDenied from "./pages/admin/AccessDenied";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminLogin from "./pages/admin/Login";
import Home from "./pages/Home";

export default function App() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/access-denied" element={<AdminAccessDenied />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </AdminAuthProvider>
  );
}
