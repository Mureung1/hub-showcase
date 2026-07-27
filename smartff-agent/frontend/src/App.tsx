import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import UploadPage from './pages/upload/UploadPage';
import AnalysisPage from './pages/analysis/AnalysisPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import FinancialPage from './pages/financial/FinancialPage';
import { sendPageview } from './services/telemetryService';

function RouteTelemetry() {
  const location = useLocation();

  useEffect(() => {
    sendPageview(location.pathname);
  }, [location.pathname]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <RouteTelemetry />
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/financial" element={<FinancialPage />} />
          <Route path="/" element={<Navigate to="/upload" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App
