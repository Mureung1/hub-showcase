import React from 'react';
import { useAuth } from '../contexts/AuthContext';

// 상단 헤더 네비게이션 컴포넌트
const AppHeader = ({ currentTab = 'community', onTabChange, onLoginClick }) => {
  const { currentUser, isLoggedIn, logout } = useAuth();

  // 로그인 필요 탭 클릭 처리
  const handleProtectedTab = (tab) => {
    if (!isLoggedIn) {
      if (onLoginClick) onLoginClick();
      return;
    }
    if (onTabChange) onTabChange(tab);
  };

  return (
    <header className="app-header">
      <div className="app-header__title logo" onClick={() => window.location.reload()} style={{ flex: 1, display: 'flex' }}>
        meetry
      </div>
      <nav className="web-nav" style={{ flexShrink: 0 }}>
        <button type="button" className={`web-nav__item ${currentTab === 'community' ? 'active' : ''}`} onClick={() => { if(onTabChange) onTabChange('community'); }}>커뮤니티</button>
        <button type="button" className={`web-nav__item ${currentTab === 'chat' ? 'active' : ''}`} onClick={() => handleProtectedTab('chat')}>1:1 대화</button>
        <button type="button" className={`web-nav__item ${currentTab === 'profile' ? 'active' : ''}`} onClick={() => handleProtectedTab('profile')}>내 프로필</button>
      </nav>
      <div className="app-header__actions" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
        {isLoggedIn ? (
          <>

            {/* 유저 아이디 표시 */}
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
              {currentUser?.username || currentUser?.email || '유저'}
            </span>
            {/* 로그아웃 버튼 */}
            <button
              onClick={logout}
              style={{
                padding: '6px 12px', fontSize: '12px', fontWeight: '600',
                color: 'var(--color-text-secondary)', backgroundColor: '#F3F4F6',
                border: '1px solid var(--color-divider)', borderRadius: '16px', cursor: 'pointer'
              }}
            >
              로그아웃
            </button>
          </>
        ) : (
          /* 비로그인 시 로그인/회원가입 버튼 */
          <button
            onClick={onLoginClick}
            style={{
              padding: '8px 16px', fontSize: '13px', fontWeight: 'bold',
              color: '#fff', backgroundColor: 'var(--color-primary-cta)',
              border: 'none', borderRadius: '20px', cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            로그인 / 회원가입
          </button>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
