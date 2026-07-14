import React, { useState, useEffect } from 'react'

function App() {
  const [connStatus, setConnStatus] = useState('connecting'); // 'connecting' | 'success' | 'failed'
  const [dbMode, setDbMode] = useState('');
  
  // E2E Test States
  const [posts, setPosts] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    // Fetch initial posts for E2E Test
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/posts`);
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newTitle || !newContent) return alert('제목과 본문을 입력해주세요.');
    setIsSubmitting(true);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          content: newContent
        })
      });
      if (!res.ok) throw new Error('Failed to create post');
      
      // 글 작성 완료 후 입력 폼 초기화 및 목록 재조회
      setNewTitle('');
      setNewContent('');
      await fetchPosts();
    } catch (err) {
      console.error('Error creating post:', err);
      alert('게시글 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

            {/* --- E2E Test Section --- */}
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-divider)', margin: '24px 0' }} />
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>🧪 E2E 연동 테스트 영역</h2>
            
            <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px', background: '#f9f9f9', padding: '16px', borderRadius: '8px' }}>
              <input 
                type="text" 
                placeholder="테스트 게시글 제목" 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <textarea 
                placeholder="테스트 게시글 본문" 
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '60px' }}
              />
              <button 
                type="submit" 
                disabled={isSubmitting}
                style={{
                  background: isSubmitting ? '#ccc' : 'var(--color-primary-cta)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}>
                {isSubmitting ? '전송 중...' : '테스트 글 작성하기 (POST)'}
              </button>
            </form>

            <div>
              <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>게시글 목록 (GET API 결과)</h3>
              {posts.length === 0 ? (
                <p style={{ color: '#888', fontSize: '14px' }}>게시글이 없습니다.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {posts.map(post => (
                    <li key={post.id} style={{ border: '1px solid #eee', padding: '12px', borderRadius: '8px' }}>
                      <strong style={{ display: 'block', fontSize: '16px', marginBottom: '4px' }}>{post.title}</strong>
                      <p style={{ fontSize: '14px', color: '#555', margin: 0 }}>{post.content}</p>
                      <small style={{ color: '#999', display: 'block', marginTop: '8px' }}>
                        작성일: {new Date(post.created_at).toLocaleString()}
                      </small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
