import { useState } from "react";

import { menuItems } from "../../data/menuItems";
import careerMissionLogo from "../../assets/career-mission-logo.png";
import {
  isAuthenticated,
  logoutUser,
} from "../../features/auth/authService";
import { navigate, routes } from "../../router";

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isLoggedIn = isAuthenticated();

  const handleLogout = () => {
    logoutUser();
    alert("로그아웃되었습니다.");
    navigate(routes.home);
  };

  const handleMyPageClick = () => {
    if (!isLoggedIn) {
      alert("마이페이지를 이용하려면 로그인 또는 회원가입을 먼저 진행해 주세요.");
      navigate(routes.login);
      return;
    }

    navigate(routes.myPage);
  };

  return (
    <header className="app-header">
      <style>{styles}</style>
      <div className="header-inner">
        <button
          type="button"
          className="cm-brand-button brand"
          onClick={() => navigate(routes.home)}
        >
          <img
            src={careerMissionLogo}
            alt=""
            className="brand-logo"
            aria-hidden="true"
          />
          <span>Career Mission</span>
        </button>

        <div className="header-actions">
          <div
            className="feature-menu"
            onMouseEnter={() => setIsMenuOpen(true)}
            onMouseLeave={() => setIsMenuOpen(false)}
            onFocus={() => setIsMenuOpen(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setIsMenuOpen(false);
              }
            }}
          >
            <button
              type="button"
              className="cm-button cm-button-primary cm-button-compact"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
            >
              핵심기능
            </button>

            {isMenuOpen && (
              <div className="submenu">
                {menuItems.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    className="cm-select-button"
                    onClick={() => {
                      navigate(item.path);
                      setIsMenuOpen(false);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isLoggedIn ? (
            <button
              type="button"
              className="cm-button cm-button-dark cm-button-compact"
              onClick={handleLogout}
            >
              로그아웃
            </button>
          ) : (
            <>
              <button
                type="button"
                className="cm-button cm-button-dark cm-button-compact"
                onClick={() => navigate(routes.login)}
              >
                로그인
              </button>
              <button
                type="button"
                className="cm-button cm-button-dark cm-button-compact"
                onClick={() => navigate(routes.signup)}
              >
                회원가입
              </button>
            </>
          )}
          <button
            type="button"
            className="cm-button cm-button-dark cm-button-compact"
            onClick={handleMyPageClick}
          >
            마이페이지
          </button>
        </div>
      </div>
    </header>
  );
}

const styles = `
.app-header {
  width: 100%;
  margin: 0;
  background: #0f172a;
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.18);
}

.header-inner {
  width: min(1440px, 100%);
  margin: 0 auto;
  padding: 11px clamp(16px, 4vw, 28px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  box-sizing: border-box;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  color: #ffffff;
  font-size: clamp(15px, 2vw, 18px);
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}

.brand-logo {
  width: 58px;
  height: 44px;
  display: block;
  object-fit: contain;
}

.header-actions {
  position: relative;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.feature-menu {
  position: relative;
  padding-bottom: 10px;
  margin-bottom: -10px;
}

.submenu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 10;
  width: min(220px, calc(100vw - 32px));
  padding: 10px;
  display: grid;
  gap: 8px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);
}

@media (max-width: 720px) {
  .header-inner {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .submenu {
    left: 0;
    right: auto;
  }
}
`;

export default Header;
