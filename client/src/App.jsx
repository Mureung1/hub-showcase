import React, { useState } from 'react'
import AppHeader from './components/AppHeader'
import FeedList from './components/FeedList'
import CreatePostModal from './components/CreatePostModal'
import PostDetail from './components/PostDetail'
import ChatRoom from './components/ChatRoom'
import ChatList from './components/ChatList'

function App() {
  // 모달 열기/닫기 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 새로고침 트리거 상태
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 상단 탭 상태 ('community' 또는 'chat')
  const [currentTab, setCurrentTab] = useState('community');

  // 선택된 게시글 상태 (상세 페이지 진입용)
  const [selectedPost, setSelectedPost] = useState(null);

  // 활성화된 채팅방 상태 (room 객체)
  const [activeChat, setActiveChat] = useState(null);

  // 새로운 채팅 시작 시 방을 생성하고 API로 저장하는 로직
  const handleStartChat = async (post, initialMessage) => {
    const generateId = () => window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
    
    const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const newRoom = {
      id: generateId(),
      postId: post.id,
      postTitle: post.title,
      partnerName: post.authorName,
      partnerGrade: post.grade_tag || post.authorGrade,
      lastMessage: initialMessage,
      lastTime: timeStr
    };

    const initialMsgs = [
      { id: Date.now(), sender: 'helper', text: initialMessage, time: timeStr }
    ];

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await fetch(`${API_URL}/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newRoom, initialMsgs })
      });
    } catch (e) {
      console.error("Failed to create chat room", e);
    }
    
    setSelectedPost(null);
    setCurrentTab('chat');
    setActiveChat(newRoom);
  };

  return (
    <div className="app-shell">
      {/* 탭 전환 상태를 헤더에 전달 */}
      <AppHeader 
        currentTab={currentTab} 
        onTabChange={(tab) => {
          setCurrentTab(tab);
          setActiveChat(null);
          setSelectedPost(null);
        }} 
      />

      {/* Main Content Area */}
      <main className="screen active" style={{ padding: '84px 16px 24px 16px' }}>
        <div className="glist-layout">

          {/* 화면 분기: 채팅방 -> 글 상세 -> (탭이 chat이면)채팅목록 -> 피드목록 */}
          {activeChat ? (
            <ChatRoom 
              room={activeChat}
              onBack={() => setActiveChat(null)}
            />
          ) : selectedPost ? (
            <PostDetail 
              post={selectedPost} 
              onBack={() => setSelectedPost(null)} 
              onStartChat={(message) => handleStartChat(selectedPost, message)}
            />
          ) : currentTab === 'chat' ? (
            <ChatList onSelectChat={setActiveChat} />
          ) : (
            <FeedList 
              refreshTrigger={refreshTrigger}
              onWriteClick={() => setIsModalOpen(true)} 
              onPostClick={setSelectedPost}
            />
          )}

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
