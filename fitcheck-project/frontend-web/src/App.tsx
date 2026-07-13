import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppStoreProvider } from './hooks/useAppStore';
import Layout from './components/layout/Layout';
import UserLayout from './components/user/UserLayout';
import UserHomePage from './pages/user/HomePage';
import UserCoursesPage from './pages/user/CoursesPage';
import UserCourseDetailPage from './pages/user/CourseDetailPage';
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
          <Route path="/" element={<Navigate to="/user" replace />} />

          <Route path="/user" element={<UserLayout />}>
            <Route index element={<UserHomePage />} />
            <Route path="courses" element={<UserCoursesPage />} />
            <Route path="courses/:id" element={<UserCourseDetailPage />} />
            <Route path="meals" element={<UserMealsPage />} />
            <Route path="map" element={<UserMapPage />} />
          </Route>

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
