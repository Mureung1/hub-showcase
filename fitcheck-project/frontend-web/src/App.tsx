import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppStoreProvider } from './hooks/useAppStore';
import Layout from './components/layout/Layout';
import UserHomePage from './pages/user/HomePage';
import UserCoursesPage from './pages/user/CoursesPage';
import UserMealsPage from './pages/user/MealsPage';
import UserMapPage from './pages/user/MapPage';
import DashboardPage from './pages/trainer/DashboardPage';
import MembersPage from './pages/trainer/MembersPage';
import RoutinePage from './pages/trainer/RoutinePage';
import MealsPage from './pages/trainer/MealsPage';
import ReportsPage from './pages/trainer/ReportsPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AppStoreProvider>
        <Routes>
          {/* 회원 모드 — 모바일 비율 화면 */}
          <Route path="/" element={<Navigate to="/user" replace />} />
          <Route path="/user" element={<UserHomePage />} />
          <Route path="/user/courses" element={<UserCoursesPage />} />
          <Route path="/user/meals" element={<UserMealsPage />} />
          <Route path="/user/map" element={<UserMapPage />} />

          {/* 트레이너 모드 — 데스크톱 대시보드 */}
          <Route path="/trainer" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="routine" element={<RoutinePage />} />
            <Route path="meals" element={<MealsPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/user" replace />} />
        </Routes>
      </AppStoreProvider>
    </BrowserRouter>
  );
}

export default App;
