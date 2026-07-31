import { Routes, Route, NavLink } from 'react-router-dom';
import HotDealPage from './pages/HotDealPage.jsx';
import HotDealFormPage from './pages/HotDealForm.jsx';
import TalentFeedPage from './pages/TalentFeedPage.jsx';
import RequestDetailPage from './pages/RequestDetailPage.jsx';
import RequestFormPage from './pages/RequestFormPage.jsx';
import WalletPage from './pages/WalletPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import TicketRedeemPage from './pages/TicketRedeemPage.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { supabase } from './lib/supabase';
import PinSettingPage from './pages/PinSettingPage.jsx';
import MyPage from './pages/MyPage.jsx';

// 화면 구성은 docs/prototype.html, 디자인 규칙은 .claude/skills/hankki-design 참고
export default function App() {
  return (
    <AuthProvider>
      <div className="app">
        <header className="appbar">
          <span className="brand">한끼<em>바꿈</em></span>
          <span className="region">부산대 앞 ▾</span>
          <AuthButton />
        </header>

        <main className="stage">
          <Routes>
            <Route path="/" element={<HotDealPage />} />
            <Route path="/hotdeal/new" element={
              <RequireAuth><HotDealFormPage /></RequireAuth>
            } />
            <Route path="/talent" element={<TalentFeedPage />} />
            <Route path="/talent/:id" element={
              <RequireAuth><RequestDetailPage /></RequireAuth>
            } />
            <Route path="/talent/new" element={
              <RequireAuth><RequestFormPage /></RequireAuth>
            } />
            <Route path="/wallet" element={
              <RequireAuth><WalletPage /></RequireAuth>
            } />
            <Route path="/wallet/redeem/:ticketId" element={
              <RequireAuth><TicketRedeemPage /></RequireAuth>
            } />
            <Route path="/mypage" element={
              <RequireAuth><MyPage /></RequireAuth>
            } />
            <Route path="/settings/pin" element={
              <RequireAuth><PinSettingPage /></RequireAuth>
            } />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Routes>
        </main>

        <nav className="tabbar">
          <NavLink to="/">🔥 동네 핫딜</NavLink>
          <NavLink to="/talent">🤝 재능 헬퍼</NavLink>
          <NavLink to="/wallet">👛 지갑</NavLink>
        </nav>
      </div>
    </AuthProvider>
  );
}

function AuthButton() {
  const { profile, loading } = useAuth();
  if (loading) return null;

  if (!profile) {
    return <NavLink to="/login" style={{ fontSize: '.84rem', fontWeight: 700 }}>로그인</NavLink>;
  }
  return (
    <NavLink
      to="/mypage"
      style={{
        fontSize: '.84rem', color: 'var(--body)', fontWeight: 600,
        textDecoration: 'none',
      }}>
      {profile.role === 'owner' ? '🍚' : '🎓'} {profile.nickname} ›
    </NavLink>
  );
}