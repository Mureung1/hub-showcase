import { NavLink } from "react-router-dom";

// 상단 네비. NavLink는 현재 경로면 active 클래스가 붙어서 어느 화면인지 표시된다.
export default function NavBar({ favCount }) {
  return (
    <nav className="nav">
      <NavLink to="/" className="nav-brand">대외활동 큐레이션</NavLink>
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => "nav-link" + (isActive ? " on" : "")}>홈</NavLink>
        <NavLink to="/favorites" className={({ isActive }) => "nav-link" + (isActive ? " on" : "")}>
          즐겨찾기{favCount > 0 ? ` ${favCount}` : ""}
        </NavLink>
      </div>
    </nav>
  );
}
