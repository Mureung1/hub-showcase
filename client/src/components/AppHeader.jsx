import React from 'react';

// 상단 헤더 네비게이션 컴포넌트
const AppHeader = () => {
  return (
    <header className="app-header">
      <div className="app-header__title logo" onClick={() => window.location.reload()}>
        meetry
      </div>
      <nav className="web-nav">
        <a href="#" className="web-nav__item active">커뮤니티</a>
        <a href="#" className="web-nav__item">1:1 대화</a>
        <a href="#" className="web-nav__item">내 프로필</a>
      </nav>
      <div className="app-header__actions">
        <button
          className="icon-btn"
          style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--color-primary-cta)' }}
        >
          로그인
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
