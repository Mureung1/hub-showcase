import { NavLink } from "react-router-dom";
import "./Navbar.css";

// 홈/할일 등록만 실제 라우트로 연결한다 — 히스토리는 화면 자체가 아직 없어 탭만 두고 비활성 표시.
const NAV_LINKS = [
  { to: "/home", label: "홈" },
  { to: "/register", label: "할일 등록" },
];

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink className="brand" to="/landing">
          <span className="brand-icon" aria-hidden="true">
            🤖
          </span>
          잔소리봇
        </NavLink>
        <div className="nav-links">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink key={to} className="nav-link" to={to}>
              {label}
            </NavLink>
          ))}
          {/* 클릭해도 아무 일 없도록 NavLink가 아니라 비활성 span으로 둔다 (히스토리 화면 미구현) */}
          <span className="nav-link nav-link-disabled" aria-disabled="true">
            히스토리
          </span>
        </div>
        {/* 알림 권한 요청 로직은 아직 없음 — 정적 버튼만 */}
        <button className="nav-perm-btn" type="button">
          🔔 알림 켜기
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
