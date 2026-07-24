import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: '홈', end: true },
  { to: '/basket', label: '수강 바구니' },
  { to: '/simulation', label: '시뮬레이션' },
  { to: '/chat', label: '챗봇' },
];

function NavBar() {
  return (
    <nav className="nav-bar">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default NavBar;
