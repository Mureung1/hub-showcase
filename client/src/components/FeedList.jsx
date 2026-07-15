import React, { useState, useEffect } from 'react';
import PostCard from './PostCard';

// 게시글 목록 컴포넌트
// - App.jsx에 있던 fetchPosts 로직과 게시글 목록 렌더링을 이 안으로 이사
// - PostCard 컴포넌트를 반복(map)하여 카드 목록을 그립니다
const FeedList = ({ onWriteClick, refreshTrigger }) => {
  // ── App.jsx에서 이사 온 State & 로직 ──
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 컴포넌트가 처음 화면에 나타날 때, 그리고 refreshTrigger가 바뀔 때마다 실행됨
  useEffect(() => {
    fetchPosts();
  }, [refreshTrigger]);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/posts`);
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error('게시글 목록 조회 오류:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 부모(App)가 "새 글 작성됐어!" 할 때 목록을 새로고침하기 위해 함수를 노출
  // → 이건 4단계에서 App.jsx와 연결할 때 사용됩니다
  // (현재는 FeedList 자체적으로 useEffect에서 첫 로딩 시 불러옴)

  return (
    <div className="feed-column" style={{
      padding: '24px',
      background: '#fff',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-divider)'
    }}>
      {/* 글 작성 버튼 */}
      <button
        className="btn btn-primary"
        onClick={onWriteClick}
        style={{ marginBottom: '20px', width: '100%' }}
      >
        ✏️ 고민글 올리기
      </button>

      {/* 게시글 카드 목록 */}
      {isLoading ? (
        <p style={{ color: '#888', fontSize: '14px', textAlign: 'center' }}>
          게시글을 불러오는 중...
        </p>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-text">아직 게시글이 없습니다. 첫 번째 고민글을 올려보세요!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedList;
