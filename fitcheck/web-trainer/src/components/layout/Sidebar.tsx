import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  UtensilsCrossed,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/', label: '대시보드', icon: LayoutDashboard, end: true },
  { to: '/members', label: '회원 관리', icon: Users, end: false },
  { to: '/routine', label: '루틴 관리', icon: Dumbbell, end: false },
  { to: '/meals', label: '식단 피드백', icon: UtensilsCrossed, end: false },
  { to: '/reports', label: '성장 리포트', icon: TrendingUp, end: false },
] as const;

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <span className="logo-mark">FT</span>
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
            {({ isActive }) => (
              <>
                <span className="nav-icon">
                  <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                </span>
                {!collapsed && <span>{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        className="sidebar-toggle"
        onClick={onToggle}
        aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}

export function useSidebarState() {
  const [collapsed, setCollapsed] = useState(false);
  return { collapsed, toggle: () => setCollapsed((p) => !p) };
}
