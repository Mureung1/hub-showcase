import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { WorkerDashboardPage } from "./pages/WorkerDashboardPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WorkerDashboardPage />} />
        <Route path="/login" element={<WorkerDashboardPage />} />
        <Route path="/signup" element={<WorkerDashboardPage />} />
        <Route path="/stores/select" element={<WorkerDashboardPage />} />
        <Route path="/schedule" element={<WorkerDashboardPage />} />
        <Route path="/schedule/:date" element={<WorkerDashboardPage />} />
        <Route path="/substitute-requests" element={<WorkerDashboardPage />} />
        <Route path="/workers" element={<WorkerDashboardPage />} />
        <Route path="/my-work" element={<WorkerDashboardPage />} />
        <Route path="/notifications" element={<WorkerDashboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
