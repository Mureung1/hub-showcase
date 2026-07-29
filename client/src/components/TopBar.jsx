import { NavLink, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore.js';
import { MapIcon, SparkleIcon, ListIcon, UserIcon, SunIcon, MoonIcon } from './icons.jsx';

const NAV_ITEMS = [
  { to: '/', label: '지도', Icon: MapIcon, end: true },
  { to: '/themes', label: '테마', Icon: SparkleIcon },
  { to: '/list', label: '리스트', Icon: ListIcon },
  { to: '/mypage', label: '마이페이지', Icon: UserIcon },
];

// 베이커리 검색창은 지도 화면(좌측 "빵집 둘러보기" 패널)과 리스트 화면 각자에 자체 검색창을 두는 걸로
// 옮겨서(화면마다 검색 대상 목록이 다르게 필터링됨), 탑바에는 더 이상 검색창을 두지 않는다.
export default function TopBar() {
  const navigate = useNavigate();
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const user = useAppStore((s) => s.user);
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  return (
    <div className="topbar">
      <button type="button" className="logo" aria-label="처음 화면으로 이동" onClick={() => navigate('/')}>
        <span className="brand-text">
          <span className="brand-sub">DAEJEON</span>
          <span className="brand-main">
            PANG MAP<span className="dot" />
          </span>
        </span>
      </button>

      <nav className="nav">
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}>
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>

      <button type="button" className="theme-toggle" aria-label="다크 모드 전환" onClick={toggleTheme}>
        {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
      </button>

      <div className="auth-actions">
        {user ? (
          <button type="button" className="user-chip" onClick={() => navigate('/mypage')}>
            <span className="avatar" />
            {user.id}님
          </button>
        ) : (
          <>
            <button type="button" className="btn-outline" onClick={() => openAuthModal('login')}>
              로그인
            </button>
            <button type="button" className="btn-solid" onClick={() => openAuthModal('signup')}>
              회원가입
            </button>
          </>
        )}
      </div>
    </div>
  );
}
