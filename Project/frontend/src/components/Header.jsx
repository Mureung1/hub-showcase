import { useState } from 'react';
import './Header.css';

export default function Header({ currentPage, onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('currentUser') || null);

  const handleDevLogin = async (userId, role) => {
    try {
      const response = await fetch('/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const result = await response.json();
      if (result.success) {
        localStorage.setItem('accessToken', result.data.accessToken);
        localStorage.setItem('currentUser', role);
        setCurrentUser(role);
        alert(`개발자 로그인 성공! (${role}로 로그인됨)`);
      } else {
        alert(`로그인 실패: ${result.error?.message}`);
      }
    } catch (err) {
      alert(`로그인 오류: ${err.message}`);
    }
    setShowDevMenu(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    alert('로그아웃 되었습니다.');
    setShowDevMenu(false);
  };

  const navItems = [
    { key: 'home', label: '홈' },
    { key: 'postfeed', label: '게시글' },
    { key: 'map', label: '지도' },
    { key: 'chat', label: '채팅' },
    { key: 'mypage', label: '마이페이지' },
  ];

  const handleNavClick = (e, key) => {
    e.preventDefault();
    if (key === 'home') {
      onNavigate('home');
    } else if (key === 'postfeed') {
      onNavigate('postfeed');
    } else if (key === 'mypage') {
      onNavigate('mypage');
    } else {
      alert(`${e.target.innerText} 서비스는 준비 중입니다.`);
    }
  };

  return (
    <header className="td-header">
      <div className="td-header__container">
        <div className="td-header__brand-nav">
          <a className="td-header__brand" href="#home" onClick={(e) => handleNavClick(e, 'home')}>
            ThingDong
          </a>
          <nav className="td-header__nav">
            {navItems.map((item) => (
              <a
                key={item.key}
                className={`td-header__nav-item ${
                  (item.key === currentPage || (item.key === 'postfeed' && currentPage === 'createpost'))
                    ? 'td-header__nav-item--active'
                    : ''
                }`}
                href={`#${item.key}`}
                onClick={(e) => handleNavClick(e, item.key)}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="td-header__actions">
          <div className="td-header__search">
            <span className="material-symbols-outlined td-header__search-icon">search</span>
            <input
              className="td-header__search-input"
              placeholder="검색..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="td-header__action-btn" aria-label="알림">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="td-header__action-btn td-header__action-btn--cart" aria-label="장바구니">
            <span className="material-symbols-outlined">shopping_cart</span>
            <span className="td-header__cart-badge">2</span>
          </button>
          <div className="td-header__avatar-container">
            <button className="td-header__avatar-btn" onClick={() => setShowDevMenu(!showDevMenu)}>
              <img
                alt="User profile"
                className="td-header__avatar"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBH5QF4lRhSy93rbMYHqWnjtP2DcwWb3tlXA3P1Dqh3TshZ5sHG5j9TJfmM6T2jE7bpFRYCsem3fPpwJB9y5euSVJXzh8nK0nyGlSKgguw5tfPPLoc-b7afdViakEZezfYr4Unffy2DG6V-MkmazqzTrValdSPb4X0gRnf_WWwaOYFfRUDbYH2BH5voR-vluj7CNhRdJz9PSY3a4gMkf1_O8Qy6jz88hgD4rDHHlcDmMH9o-mtltQ0"
              />
            </button>
            {showDevMenu && (
              <div className="td-header__dev-dropdown">
                {currentUser ? (
                  <>
                    <div className="td-header__dev-title">현재 로그인: <span>{currentUser}</span></div>
                    <button className="td-header__dev-item-btn td-header__dev-item-btn--logout" onClick={handleLogout}>
                      <span className="material-symbols-outlined">logout</span>로그아웃
                    </button>
                  </>
                ) : (
                  <>
                    <div className="td-header__dev-title">개발자 로그인</div>
                    <button className="td-header__dev-item-btn" onClick={() => handleDevLogin(1, '호스트 (방장)')}>
                      <span className="material-symbols-outlined">admin_panel_settings</span>호스트 (방장)
                    </button>
                    <button className="td-header__dev-item-btn" onClick={() => handleDevLogin(2, '참여자 (이웃)')}>
                      <span className="material-symbols-outlined">person</span>참여자 (이웃)
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
