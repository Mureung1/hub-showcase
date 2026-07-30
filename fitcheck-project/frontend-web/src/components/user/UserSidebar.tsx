import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Settings } from 'lucide-react';
import { USER_NAV_ITEMS } from '../../constants/userNav';
import { useAuth } from '../../hooks/useAuth';
import './UserSidebar.css';

function displayName(name: string | null | undefined, email: string | undefined): string {
  if (name?.trim()) return name.trim();
  if (email) return email.split('@')[0] ?? '회원';
  return '회원';
}

function avatarInitial(name: string | null | undefined, email: string | undefined): string {
  return displayName(name, email).slice(0, 1).toUpperCase();
}

export default function UserSidebar() {
  const navigate = useNavigate();
  const { profile, session, signOut } = useAuth();
  const label = displayName(profile?.name, session?.user.email);
  const initial = avatarInitial(profile?.name, session?.user.email);

  return (
    <aside className="user-sidebar" aria-label="회원 메뉴">
      <div className="user-sidebar-brand">
        <span className="user-logo-mark">F</span>
        <div className="user-sidebar-brand-text">
          <span className="user-logo">FitCheck</span>
          <span className="user-logo-sub">Member</span>
        </div>
      </div>

      <nav className="user-sidebar-nav">
        {USER_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `user-sidebar-item${isActive ? ' active' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="user-sidebar-footer">
        <NavLink to="/user/account" className="user-sidebar-profile user-sidebar-profile-link">
          <span className="avatar avatar-sm avatar-accent">{initial}</span>
          <span className="user-sidebar-name">{label}</span>
          <Settings size={16} aria-hidden="true" />
        </NavLink>
        <button
          type="button"
          className="user-sidebar-logout"
          onClick={() => {
            void signOut().then(() => navigate('/login', { replace: true }));
          }}
        >
          <LogOut size={16} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
