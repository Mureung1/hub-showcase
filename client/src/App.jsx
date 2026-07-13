import React, { useState, useEffect } from 'react'

function App() {
  const [connStatus, setConnStatus] = useState('connecting'); // 'connecting' | 'success' | 'failed'
  const [dbMode, setDbMode] = useState('');

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    fetch(`${apiUrl}/api/health`)
      .then((res) => {
        if (!res.ok) throw new Error('API response error');
        return res.json();
      })
      .then((data) => {
        if (data.status === 'ok') {
          setConnStatus('success');
          setDbMode(data.databaseMode);
        } else {
          setConnStatus('failed');
        }
      })
      .catch((err) => {
        console.error('API connection failed:', err);
        setConnStatus('failed');
      });
  }, []);

  return (
    <div className="app-shell">
      {/* App Header */}
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
          <button className="icon-btn" style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--color-primary-cta)' }}>
            로그인
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="screen active" style={{ padding: '84px 16px 24px 16px' }}>
        <div className="glist-layout">
          {/* Feed Column */}
          <div className="feed-column" style={{ padding: '24px', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-divider)' }}>
            
            {/* API Connection Health Badge */}
            <div style={{ marginBottom: '16px' }}>
              {connStatus === 'connecting' && (
                <span style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', border: '1px solid var(--color-primary)' }}>
                  ⏳ 백엔드 기본 통신 확인 중...
                </span>
              )}
              {connStatus === 'success' && (
                <span style={{ background: '#E8F5E9', color: '#2E7D32', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #A5D6A7' }}>
                  🟢 백엔드 기본 통신 성공 (DB 연동: {dbMode})
                </span>
              )}
              {connStatus === 'failed' && (
                <span style={{ background: '#FFEBEE', color: '#C62828', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #FFCDD2' }}>
                  ❌ 백엔드 기본 통신 실패 (서버 오프라인)
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '20px', marginBottom: '12px', color: 'var(--color-text-primary)' }}>
              1주차 월요일: 개발 환경 & 디자인 시스템 구축 완료! 🚀
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
              대학생 대면 소통 서비스 <strong>meetry</strong>의 모노레포 구조 및 디자인 토큰 세팅이 완료되었습니다. 
              현재 보고 계신 이 구조는 모바일 퍼스트 반응형 App Shell로 래핑되어 있습니다. (브라우저 크기를 줄여보세요!)
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
              <span style={{
                background: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500',
                border: '1px solid var(--color-primary)'
              }}>#프로젝트설정</span>
              <span style={{
                background: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500',
                border: '1px solid var(--color-primary)'
              }}>#디자인시스템</span>
              <span style={{
                background: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500',
                border: '1px solid var(--color-primary)'
              }}>#Supabase연동</span>
            </div>

            <button style={{
              background: 'var(--color-primary-cta)',
              color: '#fff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 'var(--radius-md)',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-md)',
              transition: 'background 0.2s'
            }}>
              동작 테스트 버튼
            </button>
          </div>

          {/* Sidebar Column (Visible on Desktop) */}
          <div className="sidebar-column" style={{ background: '#fff', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-divider)' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>내 정보</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              데스크톱 해상도(768px 이상)에서 보이는 2컬럼 레이아웃의 우측 사이드바입니다.
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Nav (Mobile Only) */}
      <nav className="bottom-nav" style={{ justifyContent: 'space-around' }}>
        <button style={{ background: 'none', border: 'none', color: 'var(--color-primary-cta)', fontWeight: 'bold' }}>홈</button>
        <button style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)' }}>대화</button>
        <button style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)' }}>마이</button>
      </nav>
    </div>
  )
}

export default App
