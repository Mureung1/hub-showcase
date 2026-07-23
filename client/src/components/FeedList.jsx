import React, { useState, useEffect } from 'react';
import PostCard from './PostCard';
import FeedTabs from './FeedTabs';

// 게시글 목록 컴포넌트
const FeedList = ({ onWriteClick, refreshTrigger, onPostClick, searchQuery = '', onSearch, onClearSearch }) => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentCategory, setCurrentCategory] = useState('전체');
  const [filters, setFilters] = useState({ status: '', reward: '' });

  useEffect(() => {
    fetchPosts();
  }, [refreshTrigger, currentCategory, filters, searchQuery]);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      const queryParams = new URLSearchParams();
      if (currentCategory !== '전체') queryParams.append('category', currentCategory);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.reward) queryParams.append('reward', filters.reward);
      if (searchQuery && searchQuery.trim().length >= 2) {
        queryParams.append('search', searchQuery.trim());
      }
      
      const res = await fetch(`${apiUrl}/api/posts?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error('게시글 목록 조회 오류:', err);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

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
        searchQuery={searchQuery}
        onSearch={onSearch}
      />

      {/* 검색어 활성화 상태 안내 뱃지 */}
      {searchQuery && searchQuery.trim().length >= 2 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          backgroundColor: 'var(--color-primary-light)',
          padding: '10px 16px',
          borderBottom: '1px solid var(--color-divider)',
          fontSize: '14px',
          color: 'var(--color-text-primary)'
        }}>
          <div>
            <span>🔍 <strong>"{searchQuery}"</strong> 검색 결과</span>
            <span style={{ marginLeft: '8px', color: 'var(--color-primary-cta)', fontWeight: 'bold' }}>
              ({posts.length}건)
            </span>
          </div>
          <button
            onClick={onClearSearch}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid var(--color-primary-cta)',
              color: 'var(--color-primary-cta)',
              borderRadius: '12px',
              padding: '2px 10px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            검색 지우기 ✕
          </button>
        </div>
      )}

      {/* 게시글 카드 목록 */}
      <div>
        {isLoading ? (
          <p style={{ color: '#888', fontSize: '14px', textAlign: 'center', padding: '40px' }}>
            게시글을 불러오는 중...
          </p>
        ) : posts.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>
              {searchQuery ? '🔍' : '📝'}
            </div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '15px', marginBottom: searchQuery ? '12px' : '0' }}>
              {searchQuery 
                ? `"${searchQuery}"에 대한 검색 결과가 없습니다.` 
                : '조건에 맞는 게시글이 없습니다.'}
            </div>
            {searchQuery && (
              <button
                onClick={onClearSearch}
                style={{
                  marginTop: '8px',
                  padding: '8px 16px',
                  backgroundColor: 'var(--color-primary-cta)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                전체 피드 보기
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onClick={() => onPostClick && onPostClick(post)} />
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
