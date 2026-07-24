import { logout } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import "./MainLayout.css";

function MainLayout({ children }) {
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    window.location.href = "/login";
  }

  return (
    <main>
      <header>
        <div className="header-left">
          <h1>CalMe</h1>
          <nav className="header-menu">
            <button type="button" onClick={() => navigate("/dashboard")}>
              대시보드
            </button>
            <button type="button" onClick={() => navigate("/register-event")}>
              일정 등록
            </button>
            <button type="button" onClick={() => navigate("/calendar")}>
              캘린더
            </button>
          </nav>
        </div>

        <button type="button" onClick={handleLogout}>
          로그아웃
        </button>
      </header>

      {children}
    </main>
  );
}

export default MainLayout;
