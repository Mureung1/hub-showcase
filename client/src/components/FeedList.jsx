import React, { useState, useEffect } from 'react';
import PostCard from './PostCard';
import FeedTabs from './FeedTabs';

// 게시글 목록 컴포넌트
const FeedList = ({ onWriteClick, refreshTrigger }) => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentCategory, setCurrentCategory] = useState('전체');
  const [filters, setFilters] = useState({ status: '', reward: '' });

  useEffect(() => {
    fetchPosts();
  }, [refreshTrigger, currentCategory, filters]);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      const queryParams = new URLSearchParams();
      if (currentCategory !== '전체') queryParams.append('category', currentCategory);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.reward) queryParams.append('reward', filters.reward);
      
      const res = await fetch(`${apiUrl}/api/posts?${queryParams.toString()}`);
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
      background: '#fff',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-divider)',
      position: 'relative',
      paddingBottom: '80px' // 여백 확보
    }}>
      <FeedTabs 
        currentCategory={currentCategory} 
        onCategoryChange={setCurrentCategory}
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* 게시글 카드 목록 */}
      <div>
        {isLoading ? (
          <p style={{ color: '#888', fontSize: '14px', textAlign: 'center', padding: '40px' }}>
            게시글을 불러오는 중...
          </p>
        ) : posts.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📝</div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '15px' }}>조건에 맞는 게시글이 없습니다.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>

      {/* 우하단 FAB */}
      <button
        className="fab-btn"
        onClick={onWriteClick}
      >
        <span style={{ fontSize: '22px', marginRight: '6px', fontWeight: 'bold' }}>+</span>
        글쓰기
      </button>
    </div>
  );
};

export default FeedList;
