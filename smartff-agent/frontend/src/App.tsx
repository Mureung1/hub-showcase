<<<<<<< HEAD
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import UploadPage from './pages/upload/UploadPage';
import AnalysisPage from './pages/analysis/AnalysisPage';
import DashboardPage from './pages/dashboard/DashboardPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/" element={<Navigate to="/upload" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
=======
import UploadPage from './pages/upload/UploadPage'

function App() {
  return <UploadPage />
>>>>>>> d80382baa6e3099c2408170a42795c73ec67d4f5
}

export default App
