import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { getProfile } from './api/profile';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Article from './pages/Article';
import Insight from './pages/Insight';
import ComingSoon from './pages/ComingSoon';
import AppLayout from './layouts/AppLayout';

function PrivateRoute() {
  const { status } = useAuth();
  if (status === 'loading') return null;
  return status === 'authenticated' ? <Outlet /> : <Navigate to="/login" replace />;
}

function OnboardingGate({ children }) {
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

  return children;
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
            <Route element={<AppLayout />}>
              <Route path="/" element={<OnboardingGate><Home /></OnboardingGate>} />
              <Route path="/articles/:id" element={<OnboardingGate><Article /></OnboardingGate>} />
              <Route
                path="/trend"
                element={<OnboardingGate><ComingSoon title="트렌드" description="스트레치 목표 — 아직 준비 중이에요." /></OnboardingGate>}
              />
              <Route
                path="/insight"
                element={<OnboardingGate><Insight /></OnboardingGate>}
              />
              <Route
                path="/mypage"
                element={<OnboardingGate><ComingSoon title="마이페이지" description="아직 준비 중이에요." /></OnboardingGate>}
              />
              <Route
                path="/settings"
                element={<OnboardingGate><ComingSoon title="설정" description="아직 준비 중이에요." /></OnboardingGate>}
              />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
