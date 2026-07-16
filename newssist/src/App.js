import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { getProfile } from './api/profile';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';

function PrivateRoute() {
  const { status } = useAuth();
  if (status === 'loading') return null;
  return status === 'authenticated' ? <Outlet /> : <Navigate to="/login" replace />;
}

function PlaceholderHome() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getProfile().then((profile) => {
      if (profile === null) {
        navigate('/onboarding', { replace: true });
      } else {
        setChecking(false);
      }
    });
  }, [navigate]);

  if (checking) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-stack-md bg-surface">
      <p className="font-body-lg text-body-lg text-on-surface">로그인 성공 — 홈은 7/19에 구현 예정</p>
      <p className="font-body-md text-body-md text-on-surface-variant">{user?.email}</p>
      <button
        onClick={signOut}
        className="bg-btn-gray text-on-surface rounded-lg px-4 py-2 font-body-md"
      >
        로그아웃
      </button>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route element={<PrivateRoute />}>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/" element={<PlaceholderHome />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
