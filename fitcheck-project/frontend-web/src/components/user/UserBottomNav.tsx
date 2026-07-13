import { NavLink } from 'react-router-dom';
import { Home, PlayCircle, UtensilsCrossed, MapPinned } from 'lucide-react';
import './UserBottomNav.css';

const NAV_ITEMS = [
  { to: '/user', label: '홈', icon: Home, end: true },
  { to: '/user/courses', label: '강좌', icon: PlayCircle, end: false },
  { to: '/user/meals', label: '식단', icon: UtensilsCrossed, end: false },
  { to: '/user/map', label: '지도', icon: MapPinned, end: false },
] as const;

export default function UserBottomNav() {
  return (
    <nav className="user-bottom-nav" aria-label="회원 하단 메뉴">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `user-bottom-nav-item${isActive ? ' active' : ''}`
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
