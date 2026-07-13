import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  UtensilsCrossed,
  TrendingUp,
} from 'lucide-react';
import './BottomNav.css';

const NAV_ITEMS = [
  { to: '/trainer', label: '홈', icon: LayoutDashboard, end: true },
  { to: '/trainer/members', label: '회원', icon: Users, end: false },
  { to: '/trainer/routine', label: '루틴', icon: Dumbbell, end: false },
  { to: '/trainer/meals', label: '식단', icon: UtensilsCrossed, end: false },
  { to: '/trainer/reports', label: '리포트', icon: TrendingUp, end: false },
] as const;

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="모바일 메뉴">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `bottom-nav-item${isActive ? ' active' : ''}`
          }
        >
          {({ isActive }) => (
            <>
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
