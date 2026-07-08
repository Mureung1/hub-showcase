import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/', label: '대시보드', icon: '📊', end: true },
  { to: '/members', label: '회원 관리', icon: '👥', end: false },
  { to: '/routine', label: '루틴 관리', icon: '🏋️', end: false },
  { to: '/meals', label: '식단 피드백', icon: '🍽️', end: false },
] as const;

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <span className="logo-mark">FC</span>
        {!collapsed && (
          <div className="brand-text">
            <span className="logo">FitCheck</span>
            <span className="logo-sub">Trainer</span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `nav-item${isActive ? ' active' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        className="sidebar-toggle"
        onClick={onToggle}
        aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
      >
        {collapsed ? '→' : '←'}
      </button>
    </aside>
  );
}

export function useSidebarState() {
  const [collapsed, setCollapsed] = useState(false);
  return { collapsed, toggle: () => setCollapsed((p) => !p) };
}
