import React, { useState } from 'react'
import AppHeader from './components/AppHeader'
import FeedList from './components/FeedList'
import CreatePostModal from './components/CreatePostModal'

function App() {
  // 모달 열기/닫기 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 새로고침 트리거 상태 (숫자가 바뀔 때마다 목록 새로고침)
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="app-shell">
      {/* 1단계에서 분리한 상단바 */}
      <AppHeader />

      {/* Main Content Area */}
      <main className="screen active" style={{ padding: '84px 16px 24px 16px' }}>
        <div className="glist-layout">

          {/* 3단계에서 분리한 게시글 목록 */}
          {/* refreshTrigger 값이 바뀔 때마다 FeedList가 이를 감지하고 데이터를 다시 불러옵니다 */}
          <FeedList 
            refreshTrigger={refreshTrigger}
            onWriteClick={() => setIsModalOpen(true)} 
          />

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

      {/* 2단계에서 분리한 글 작성 모달 */}
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPostCreated={() => setRefreshTrigger(prev => prev + 1)} 
      />
    </div>
  )
}

export default App
