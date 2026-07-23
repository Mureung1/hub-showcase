import React from 'react';

// 게시글 카드 1장 컴포넌트
// - index.html의 .feed-card 디자인을 React로 이식
// - 부모(FeedList)로부터 post 데이터 1건을 Props로 받아서 화면에 그립니다
const PostCard = ({ post, onClick }) => {
  // 보상 배지 렌더링 함수
  const renderRewardBadge = () => {
    if (post.reward === '음료 제공') {
      return <span className="reward-badge drink">☕ 음료 제공</span>;
    }
    if (post.reward === '식사 제공') {
      return <span className="reward-badge meal">🍽️ 식사 제공</span>;
    }
    return null; // '없음'이면 배지 안 보임
  };

  // 작성 시간 표시 (예: "3분 전", "2시간 전")
  const getTimeAgo = (dateString) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffMs = now - created;
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;

    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}일 전`;
  };

  return (
    <div className="feed-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {/* 카드 상단: 태그 배지 + 보상 배지 */}
      <div className="feed-card-header">
        <div className="category-badges">
          {(post.major_tag || post.author_major) && (post.major_tag !== '미상' && post.author_major !== '미상') && (
            <span className="badge">#{post.major_tag || post.author_major}</span>
          )}
          {post.tags && post.tags.length > 0 ? (
            post.tags
              .filter(tag => tag !== post.major_tag && tag !== post.author_major && tag !== post.grade_tag && tag !== post.author_grade)
              .map((tag) => (
                <span key={tag} className="badge">#{tag}</span>
              ))
          ) : post.topic_tags && post.topic_tags.length > 0 ? (
            post.topic_tags.map((tag) => (
              <span key={tag} className="badge">#{tag}</span>
            ))
          ) : null}
        </div>
        {renderRewardBadge()}
      </div>

      {/* 카드 제목 */}
      <div className="feed-card-title">
        <span className="bullet-point">●</span>
        <span>{post.title || '제목 없음'}</span>
      </div>

      {/* 카드 본문 미리보기 */}
      <div className="feed-card-body">
        {post.content || '본문 내용이 없습니다.'}
      </div>

      {/* 카드 하단: 작성자 정보 + 메타 */}
      <div className="feed-card-footer">
        <span className="author-info">
          {post.authorName || '익명'} ({post.grade_tag || post.authorGrade || '학년'})
        </span>
        <div className="card-meta-right">
          <span className="meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {post.views || 0}
          </span>
          <span>{getTimeAgo(post.created_at)}</span>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
