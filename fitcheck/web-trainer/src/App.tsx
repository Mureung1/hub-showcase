import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppStoreProvider } from './hooks/useAppStore';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import MembersPage from './pages/MembersPage';
import RoutinePage from './pages/RoutinePage';
import MealsPage from './pages/MealsPage';
import ReportsPage from './pages/ReportsPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AppStoreProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="routine" element={<RoutinePage />} />
            <Route path="meals" element={<MealsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AppStoreProvider>
    </BrowserRouter>
  );
}

export default App;
