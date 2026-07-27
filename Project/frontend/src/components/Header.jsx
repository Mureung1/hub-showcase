import { useEffect, useState } from 'react';
import { deleteMyNotification, getFavoriteGroupPurchases, getMyNotifications } from '../api/groupPurchase';
import { defaultProfileImageUrl, getProfileImageUrl } from '../utils/profileImage';
import './Header.css';

export default function Header({ currentPage, onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('currentUser') || null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const activeProfile = (currentUser === 'host' || currentUser === '호스트 (방장)')
    ? { label: '방장 민지', image: 'https://i.pravatar.cc/160?img=47' }
    : { label: '참여자 서준', image: 'https://i.pravatar.cc/160?img=12' };

  const displayProfile = !currentUser
    ? { label: '로그인 필요', image: defaultProfileImageUrl }
    : currentUser === 'host'
      ? { label: '방장 민지', image: getProfileImageUrl(1) }
      : currentUser === 'participant'
        ? { label: '참여자 서준', image: getProfileImageUrl(2) }
        : { label: '이웃 다은', image: getProfileImageUrl(3) };

  useEffect(() => {
    async function loadNotifications() {
      if (!localStorage.getItem('accessToken')) {
        setNotifications([]);
        setFavorites([]);
        return;
      }
      try {
        const result = await getMyNotifications();
        if (result.success) setNotifications(result.data);
        const favoriteResult = await getFavoriteGroupPurchases();
        if (favoriteResult.success) setFavorites(favoriteResult.data);
      } catch (error) {
        console.warn('Failed to load notifications:', error.message || error);
      }
    }
    loadNotifications();
  }, [currentUser]);

  async function handleDeleteNotification(event, notificationId) {
    event.stopPropagation();
    try {
      const result = await deleteMyNotification(notificationId);
      if (!result.success) throw new Error(result.error?.message || '알림을 삭제하지 못했습니다.');
      setNotifications((current) => current.filter((notification) => notification.id !== notificationId));
    } catch (error) {
      alert(error.message || '알림을 삭제하지 못했습니다.');
    }
  }

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
        const profileKey = result.data.user?.id === 1 ? 'host' : result.data.user?.id === 2 ? 'participant' : 'neighbor';
        localStorage.setItem('currentUser', profileKey);
        setCurrentUser(profileKey);
        window.setTimeout(() => window.location.reload(), 0);
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
    window.setTimeout(() => window.location.reload(), 0);
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
                <div className="td-header__notification-row" key={notification.id}>
                <button
                  className="td-header__notification-item"
                  onClick={() => {
                    setShowNotifications(false);
                    onNavigate('detail', notification.groupPurchaseId);
                  }}
                >
                  <b>{notification.title}</b>
                  <span>{notification.content}</span>
                </button>
                <button
                  type="button"
                  className="td-header__notification-delete-btn"
                  aria-label="알림 삭제"
                  onClick={(event) => handleDeleteNotification(event, notification.id)}
                >
                  ×
                </button>
                </div>
              ))}
            </div>
          )}
          </div>
          <button className="td-header__action-btn td-header__action-btn--cart" aria-label="장바구니">
            <span
              aria-label="찜한 공동구매 보기"
              onClick={() => onNavigate('favorites')}
            >
              ♥
            </span>
          </button>
          {showFavorites && (
            <div className="td-header__favorite-dropdown">
              <strong>찜한 공동구매</strong>
              {favorites.length === 0 ? (
                <p>아직 찜한 공동구매가 없어요.</p>
              ) : favorites.map((purchase) => (
                <button
                  className="td-header__favorite-item"
                  key={purchase.id}
                  onClick={() => {
                    setShowFavorites(false);
                    onNavigate('detail', purchase.id);
                  }}
                >
                  <img src={purchase.imageUrl || purchase.imageUrls?.[0]} alt="" />
                  <span>{purchase.title}</span>
                </button>
              ))}
            </div>
          )}
          <div className="td-header__avatar-container">
            <button className="td-header__avatar-btn" onClick={() => setShowDevMenu(!showDevMenu)}>
              <img
                alt={displayProfile.label}
                className="td-header__avatar"
                src={displayProfile.image}
              />
            </button>
            {showDevMenu && (
              <div className="td-header__dev-dropdown">
                {currentUser ? (
                  <>
                    <div className="td-header__dev-title">현재 로그인: <span>{displayProfile.label}</span></div>
                    <button className="td-header__dev-item-btn td-header__dev-item-btn--logout" onClick={handleLogout}>
                      <span className="material-symbols-outlined">logout</span>로그아웃
                    </button>
                  </>
                ) : (
                  <>
                    <button className="td-header__dev-item-btn" onClick={() => handleDevLogin(3, '이웃 다은')}>
                      <span className="material-symbols-outlined">face</span>이웃 다은
                    </button>
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
