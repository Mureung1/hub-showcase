import React, { useState, useEffect } from 'react'
import AppHeader from './components/AppHeader'
import FeedList from './components/FeedList'
import CreatePostModal from './components/CreatePostModal'
import PostDetail from './components/PostDetail'
import PostCard from './components/PostCard'
import ChatRoom from './components/ChatRoom'
import ChatList from './components/ChatList'
import LoginModal from './components/LoginModal'
import SignUpModal from './components/SignUpModal'
import { useAuth } from './contexts/AuthContext'

function App() {
  const { currentUser, isLoggedIn } = useAuth();
  
  // 모달 열기/닫기 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 새로고침 트리거 상태
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 로그아웃 시 메인 화면으로 초기화
  useEffect(() => {
    if (isLoggedIn === false) {
      setCurrentTab('community');
      setSelectedPost(null);
      setActiveChat(null);
    }
  }, [isLoggedIn]);

  // 상단 탭 상태 ('community' 또는 'chat' 또는 'profile')
  const [currentTab, setCurrentTab] = useState('community');

  // 선택된 게시글 상태 (상세 페이지 진입용)
  const [selectedPost, setSelectedPost] = useState(null);

  // 활성화된 채팅방 상태 (room 객체)
  const [activeChat, setActiveChat] = useState(null);

  // 검색어 상태
  const [searchQuery, setSearchQuery] = useState('');

  // 내가 쓴 글 상태
  const [myPosts, setMyPosts] = useState([]);

  // 로그인/회원가입 모달 상태
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);

  // 로그인 후 이동할 목적지 (비로그인 접근 차단 시 저장)
  const [pendingAction, setPendingAction] = useState(null);

  // 내가 쓴 글 조회 로직
  useEffect(() => {
    const fetchMyPosts = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API_URL}/api/posts`);
        if (res.ok) {
          const data = await res.json();
          const posts = Array.isArray(data) ? data : (data.data || []);
          if (currentUser) {
            const mine = posts.filter(p => 
              String(p.author_id) === String(currentUser.id) || 
              p.authorName === currentUser.username
            );
            setMyPosts(mine);
          }
        }
      } catch (e) {
        console.error('Failed to fetch my posts:', e);
      }
    };
    if (isLoggedIn) {
      fetchMyPosts();
    } else {
      setMyPosts([]);
    }
  }, [refreshTrigger, currentUser, isLoggedIn]);

  // 로그인 성공 후 대기 중이던 액션 실행
  useEffect(() => {
    if (isLoggedIn && pendingAction) {
      if (pendingAction.type === 'tab') {
        setCurrentTab(pendingAction.value);
      } else if (pendingAction.type === 'post') {
        setSelectedPost(pendingAction.value);
      } else if (pendingAction.type === 'write') {
        setIsModalOpen(true);
      }
      setPendingAction(null);
    }
  }, [isLoggedIn, pendingAction]);

  // 비로그인 접근 차단 → 로그인 모달 띄움
  const requireLogin = (action) => {
    if (!isLoggedIn) {
      setPendingAction(action);
      setIsLoginModalOpen(true);
      return true; // 차단됨
    }
    return false; // 통과
  };

  // 글 배너(카드) 클릭 처리
  const handlePostClick = (post) => {
    if (requireLogin({ type: 'post', value: post })) return;
    setSelectedPost(post);
  };

  // 글쓰기(FAB) 클릭 처리
  const handleWriteClick = () => {
    if (requireLogin({ type: 'write' })) return;
    setIsModalOpen(true);
  };

  // 탭 변경 처리 (헤더에서 호출)
  const handleTabChange = (tab) => {
    setCurrentTab(tab);
    setActiveChat(null);
    setSelectedPost(null);
  };

  // 로그인 모달에서 회원가입으로 전환
  const switchToSignUp = () => {
    setIsLoginModalOpen(false);
    setIsSignUpModalOpen(true);
  };

  // 회원가입 모달에서 로그인으로 전환
  const switchToLogin = () => {
    setIsSignUpModalOpen(false);
    setIsLoginModalOpen(true);
  };

  // 새로운 채팅 시작 시 방을 생성하고 API로 저장하는 로직
  const handleStartChat = async (post, initialMessage) => {
    const generateId = () => window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
    
    const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const newRoom = {
      id: generateId(),
      postId: post.id,
      postTitle: post.title,
      host_id: post.author_id,
      helper_id: currentUser.id,
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
        searchQuery={searchQuery}
        onSearch={(q) => setSearchQuery(q)}
        onTabChange={handleTabChange}
        onLoginClick={() => setIsLoginModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="screen active" style={{ padding: '84px 16px 24px 16px' }}>
        <div className="glist-layout">

          {/* 화면 분기: 채팅방 -> 글 상세 -> (탭이 chat이면)채팅목록 -> (탭이 profile이면)내프로필 -> 피드목록 */}
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
              onPostDeleted={() => {
                setSelectedPost(null);
                setRefreshTrigger(prev => prev + 1);
              }}

              onPostEdited={() => {
                setSelectedPost(null);
                setRefreshTrigger(prev => prev + 1);
              }}
              onChatCreated={(chat) => {
                setSelectedPost(null);
                setCurrentTab('chat');
                setActiveChat({
                  id: chat.id,
                  postId: chat.post_id,
                  postTitle: chat.post_title,
                  host_id: chat.host_id,
                  helper_id: chat.helper_id,
                  partnerName: currentUser?.id === chat.host_id ? chat.helper_name : chat.host_name,
                  partnerGrade: chat.partner_grade,
                  lastMessage: chat.last_message,
                  lastTime: chat.last_time,
                  unreadCount: 0
                });
              }}
            />
          ) : currentTab === 'chat' ? (
            <ChatList onSelectChat={setActiveChat} />
          ) : currentTab === 'profile' ? (
            <div style={{ background: '#fff', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-divider)' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '1px solid var(--color-divider)', paddingBottom: '12px' }}>
                👤 내 프로필
              </h2>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>계정 아이디</div>
                <strong style={{ fontSize: '18px', color: 'var(--color-text-primary)' }}>{currentUser?.username || currentUser?.email || 'Guest'}</strong>
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--color-primary-orange)' }}>
                  📝 내가 작성한 글 ({myPosts.length}개)
                </h3>
                {myPosts.length === 0 ? (
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>
                    작성한 고민글이 없습니다.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {myPosts.map(post => (
                      <PostCard key={post.id} post={post} onClick={() => handlePostClick(post)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <FeedList 
              refreshTrigger={refreshTrigger}
              searchQuery={searchQuery}
              onSearch={(q) => setSearchQuery(q)}
              onClearSearch={() => setSearchQuery('')}
              onWriteClick={handleWriteClick} 
              onPostClick={handlePostClick}
            />
          )}

          {/* Sidebar Column (Visible on Desktop) */}
          <div className="sidebar-column" style={{ background: '#fff', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-divider)', height: 'fit-content' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '14px', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-divider)', paddingBottom: '8px' }}>
              내 정보
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '2px' }}>내 아이디</span>
                <strong style={{ fontSize: '14px', color: 'var(--color-text-primary)', wordBreak: 'break-all' }}>
                  {isLoggedIn ? (currentUser?.username || currentUser?.email) : '로그인이 필요합니다'}
                </strong>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#F8F9FA', borderRadius: '8px', border: '1px solid var(--color-divider)' }}>
                <span style={{ fontSize: '20px' }}>📝</span>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>내가 쓴 글</div>
                  <strong style={{ fontSize: '16px', color: 'var(--color-primary-orange)' }}>{myPosts.length}개</strong>
                </div>
              </div>

              {!isLoggedIn && (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  style={{
                    padding: '10px', fontSize: '13px', fontWeight: 'bold',
                    color: '#fff', backgroundColor: 'var(--color-primary-cta)',
                    border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer'
                  }}
                >
                  로그인하기
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Nav (Mobile Only) */}
      <nav className="bottom-nav" style={{ justifyContent: 'space-around' }}>
        <button 
          onClick={() => { setCurrentTab('community'); setActiveChat(null); setSelectedPost(null); }}
          style={{ background: 'none', border: 'none', color: currentTab === 'community' ? 'var(--color-primary-cta)' : 'var(--color-text-tertiary)', fontWeight: 'bold', cursor: 'pointer' }}
        >
          홈
        </button>
        <button 
          onClick={() => { if (!requireLogin({ type: 'tab', value: 'chat' })) { setCurrentTab('chat'); setSelectedPost(null); } }}
          style={{ background: 'none', border: 'none', color: currentTab === 'chat' ? 'var(--color-primary-cta)' : 'var(--color-text-tertiary)', fontWeight: 'bold', cursor: 'pointer' }}
        >
          대화
        </button>
      </nav>

      {/* 글 작성 모달 */}
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPostCreated={() => setRefreshTrigger(prev => prev + 1)} 
      />

      {/* 로그인 모달 */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => { setIsLoginModalOpen(false); setPendingAction(null); }}
        onSwitchToSignUp={switchToSignUp}
      />

      {/* 회원가입 모달 */}
      <SignUpModal
        isOpen={isSignUpModalOpen}
        onClose={() => { setIsSignUpModalOpen(false); setPendingAction(null); }}
        onSwitchToLogin={switchToLogin}
      />
    </div>
  )
}

export default App
