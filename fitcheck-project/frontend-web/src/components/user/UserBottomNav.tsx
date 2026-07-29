import { NavLink } from 'react-router-dom';
import { USER_NAV_ITEMS } from '../../constants/userNav';
import './UserBottomNav.css';

export default function UserBottomNav() {
  return (
    <nav className="user-bottom-nav" aria-label="회원 하단 메뉴">
      {USER_NAV_ITEMS.map((item) => (
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
