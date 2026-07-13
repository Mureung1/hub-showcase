import { NavLink } from 'react-router-dom';
import './UserHeader.css';

const TABS = [
  { to: '/user', label: '홈', end: true },
  { to: '/user/courses', label: '강좌', end: false },
  { to: '/user/meals', label: '식단', end: false },
  { to: '/user/map', label: '지도', end: false },
] as const;

export default function UserHeader() {
  return (
    <header className="user-header">
      <div className="user-header-inner">
        <div className="user-brand">
          <span className="user-logo-mark">FC</span>
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
          <span className="avatar avatar-sm avatar-accent">나</span>
          <span className="user-header-name">김회원</span>
        </div>
      </div>
    </header>
  );
}
