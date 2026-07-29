import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppStoreProvider } from './hooks/useAppStore';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import UserLayout from './components/user/UserLayout';
import LandingPage from './pages/landing/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import AuthCallbackPage from './pages/auth/AuthCallbackPage';
import UserHomePage from './pages/user/HomePage';
import UserCoursesPage from './pages/user/CoursesPage';
import UserCourseDetailPage from './pages/user/CourseDetailPage';
import UserMealsPage from './pages/user/MealsPage';
import UserMapPage from './pages/user/MapPage';
import UserGymDetailPage from './pages/user/GymDetailPage';
import DashboardPage from './pages/trainer/DashboardPage';
import MembersPage from './pages/trainer/MembersPage';
import ConsultInboxPage from './pages/trainer/ConsultInboxPage';
import RoutinePage from './pages/trainer/RoutinePage';
import MealsPage from './pages/trainer/MealsPage';
import ReportsPage from './pages/trainer/ReportsPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppStoreProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/user" element={<UserLayout />}>
                <Route index element={<UserHomePage />} />
                <Route path="courses" element={<UserCoursesPage />} />
                <Route path="courses/:id" element={<UserCourseDetailPage />} />
                <Route path="meals" element={<UserMealsPage />} />
                <Route path="map" element={<UserMapPage />} />
                <Route path="gym/:id" element={<UserGymDetailPage />} />
              </Route>
            </Route>

            <Route path="/trainer" element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="consults" element={<ConsultInboxPage />} />
              <Route path="routine" element={<RoutinePage />} />
              <Route path="meals" element={<MealsPage />} />
              <Route path="reports" element={<ReportsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppStoreProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
