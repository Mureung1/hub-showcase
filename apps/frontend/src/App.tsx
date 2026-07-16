import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { GuestRoute, ProtectedRoute } from "./features/auth";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { StoreSelectPage } from "./pages/StoreSelectPage";
import { WorkerDashboardPage } from "./pages/WorkerDashboardPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/schedule" replace />} />
          <Route path="/stores/select" element={<StoreSelectPage />} />
          <Route path="/schedule" element={<WorkerDashboardPage />} />
          <Route path="/schedule/:date" element={<WorkerDashboardPage />} />
          <Route path="/substitute-requests" element={<WorkerDashboardPage />} />
          <Route path="/workers" element={<WorkerDashboardPage />} />
          <Route path="/my-work" element={<WorkerDashboardPage />} />
          <Route path="/notifications" element={<WorkerDashboardPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
