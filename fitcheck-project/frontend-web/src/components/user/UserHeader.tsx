import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { USER_NAV_ITEMS } from '../../constants/userNav';
import { useAuth } from '../../hooks/useAuth';
import './UserHeader.css';

const TABS = USER_NAV_ITEMS;

function displayName(name: string | null | undefined, email: string | undefined): string {
  if (name?.trim()) return name.trim();
  if (email) return email.split('@')[0] ?? '회원';
  return '회원';
}

function avatarInitial(name: string | null | undefined, email: string | undefined): string {
  const base = displayName(name, email);
  return base.slice(0, 1).toUpperCase();
}

export default function UserHeader() {
  const navigate = useNavigate();
  const { profile, session, signOut } = useAuth();
  const label = displayName(profile?.name, session?.user.email);
  const initial = avatarInitial(profile?.name, session?.user.email);

  return (
    <header className="user-header">
      <div className="user-header-inner">
        <div className="user-brand">
          <span className="user-logo-mark">F</span>
          <div className="user-brand-text">
            <span className="user-logo">FitCheck</span>
            <span className="user-logo-sub">Member</span>
          </div>
        </div>

        <nav className="user-top-nav" aria-label="회원 메뉴">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `user-top-nav-item${isActive ? ' active' : ''}`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <div className="user-header-profile">
          <NavLink to="/user/account" className="user-header-profile-link">
            <span className="avatar avatar-sm avatar-accent">{initial}</span>
            <span className="user-header-name">{label}</span>
          </NavLink>
          <button
            type="button"
            className="user-header-logout"
            onClick={() => {
              void signOut().then(() => navigate('/login', { replace: true }));
            }}
            aria-label="로그아웃"
            title="로그아웃"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
