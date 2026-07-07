import { useState } from "react";

const menuItems = ["스펙 등록", "AI 분석", "미션 수행", "피드백", "포트폴리오"];

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="app-header">
      <style>{styles}</style>
      <div className="header-inner">
        <strong className="brand">Career Mission AI</strong>

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
              className="feature-button"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
            >
              핵심기능
            </button>

            {isMenuOpen && (
              <div className="submenu">
                {menuItems.map((item) => (
                  <button key={item} type="button" className="submenu-item">
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" className="auth-button secondary">
            로그인
          </button>
          <button type="button" className="auth-button secondary">
            회원가입
          </button>
          <button type="button" className="auth-button mypage">
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
  margin: 0 0 34px;
  background: #0f172a;
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.18);
}

.header-inner {
  width: min(1440px, 100%);
  margin: 0 auto;
  padding: 16px clamp(16px, 4vw, 28px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  box-sizing: border-box;
}

.brand {
  color: #ffffff;
  font-size: clamp(15px, 2vw, 18px);
  white-space: nowrap;
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
}

.feature-button,
.auth-button,
.submenu-item {
  font: inherit;
  cursor: pointer;
}

.feature-button,
.auth-button {
  min-height: 36px;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  transition:
    background 180ms ease,
    border-color 180ms ease,
    color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.feature-button {
  color: #ffffff;
  background: linear-gradient(135deg, #2563eb, #06b6d4);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.24);
}

.feature-button:hover {
  background: linear-gradient(135deg, #1d4ed8, #0891b2);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.34);
}

.feature-button:active {
  background: linear-gradient(135deg, #1e40af, #0e7490);
  transform: scale(0.96);
}

.auth-button.secondary,
.auth-button.mypage {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.auth-button.secondary:hover,
.auth-button.mypage:hover {
  color: #ffffff;
  background: rgba(37, 99, 235, 0.32);
  border-color: rgba(96, 165, 250, 0.5);
}

.auth-button.secondary:active,
.auth-button.mypage:active {
  background: rgba(29, 78, 216, 0.5);
  transform: scale(0.96);
}

.submenu {
  position: absolute;
  top: calc(100% + 10px);
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

.submenu-item {
  width: 100%;
  padding: 11px 12px;
  border: 0;
  border-radius: 11px;
  background: #f8fafc;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
  text-align: left;
  transition:
    background 180ms ease,
    color 180ms ease,
    transform 180ms ease;
}

.submenu-item:hover {
  background: #eef6ff;
  color: #2563eb;
}

.submenu-item:active {
  background: #dbeafe;
  color: #1d4ed8;
  transform: scale(0.98);
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
