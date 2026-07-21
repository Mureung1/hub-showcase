import React from 'react';
import { useAuth } from '../contexts/AuthContext';

// 상단 헤더 네비게이션 컴포넌트
const AppHeader = ({ currentTab = 'community', onTabChange }) => {
  const { currentUser, toggleRole } = useAuth();

  return (
    <header className="app-header">
      <div className="app-header__title logo" onClick={() => window.location.reload()}>
        meetry
      </div>
      <nav className="web-nav">
        <a href="#" className={`web-nav__item ${currentTab === 'community' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); if(onTabChange) onTabChange('community'); }}>커뮤니티</a>
        <a href="#" className={`web-nav__item ${currentTab === 'chat' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); if(onTabChange) onTabChange('chat'); }}>1:1 대화</a>
        <a href="#" className="web-nav__item">내 프로필</a>
      </nav>
      <div className="app-header__actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {currentUser && (
          <button 
            onClick={toggleRole}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 'bold',
              color: 'var(--color-primary-orange)',
              backgroundColor: 'var(--color-tag-bg)',
              border: '1px solid var(--color-primary-orange)',
              borderRadius: '16px',
              cursor: 'pointer'
            }}
            title="클릭하여 역할 전환 (임시 테스트용)"
          >
            {currentUser.role === 'host' ? '👑 방장' : '🤝 도와주는 사람'} 🔄
          </button>
        )}
        <button className="icon-btn" title="검색">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
        <button className="icon-btn" title="마이페이지">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
