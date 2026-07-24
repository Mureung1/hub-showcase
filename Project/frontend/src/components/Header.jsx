import { useEffect, useState } from 'react';
import { getMyNotifications } from '../api/groupPurchase';
import './Header.css';

export default function Header({ currentPage, onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('currentUser') || null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const activeProfile = (currentUser === 'host' || currentUser === '호스트 (방장)')
    ? { label: '방장 민지', image: 'https://i.pravatar.cc/160?img=47' }
    : { label: '참여자 서준', image: 'https://i.pravatar.cc/160?img=12' };

  useEffect(() => {
    async function loadNotifications() {
      if (!localStorage.getItem('accessToken')) {
        setNotifications([]);
        return;
      }
      try {
        const result = await getMyNotifications();
        if (result.success) setNotifications(result.data);
      } catch (error) {
        console.warn('Failed to load notifications:', error.message || error);
      }
    }
    loadNotifications();
  }, [currentUser]);

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
        const profileKey = result.data.user?.id === 1 ? 'host' : 'participant';
        localStorage.setItem('currentUser', profileKey);
        setCurrentUser(profileKey);
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
          <div className="td-header__notification-container">
          <button className="td-header__action-btn" aria-label="알림" onClick={() => setShowNotifications((visible) => !visible)}>
            <span className="material-symbols-outlined">notifications</span>
            {notifications.length > 0 && <span className="td-header__notification-badge">{notifications.length}</span>}
          </button>
          {showNotifications && (
            <div className="td-header__notification-dropdown">
              <strong>알림</strong>
              {notifications.length === 0 ? (
                <p>새 알림이 없어요.</p>
              ) : notifications.map((notification) => (
                <button
                  className="td-header__notification-item"
                  key={notification.id}
                  onClick={() => {
                    setShowNotifications(false);
                    onNavigate('detail', notification.groupPurchaseId);
                  }}
                >
                  <b>{notification.title}</b>
                  <span>{notification.content}</span>
                </button>
              ))}
            </div>
          )}
          </div>
          <button className="td-header__action-btn td-header__action-btn--cart" aria-label="장바구니">
            <span className="material-symbols-outlined">shopping_cart</span>
            <span className="td-header__cart-badge">2</span>
          </button>
          <div className="td-header__avatar-container">
            <button className="td-header__avatar-btn" onClick={() => setShowDevMenu(!showDevMenu)}>
              <img
                alt={activeProfile.label}
                className="td-header__avatar"
                src={activeProfile.image}
              />
            </button>
            {showDevMenu && (
              <div className="td-header__dev-dropdown">
                {currentUser ? (
                  <>
                    <div className="td-header__dev-title">현재 로그인: <span>{activeProfile.label}</span></div>
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
