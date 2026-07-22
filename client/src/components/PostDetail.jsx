import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ChatRequestModal from './ChatRequestModal';

const PostDetail = ({ post, onBack, onStartChat }) => {
  const { currentUser } = useAuth();
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  const handleChatRequest = (message) => {
    setIsChatModalOpen(false);
    if (onStartChat) {
      onStartChat(message);
    }
  };

  return (
    <div className="feed-column" style={{
      background: '#fff',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-divider)',
      padding: '32px',
      position: 'relative',
      minHeight: '600px', // PC 뷰 안정감을 위한 최소 높이
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 뒤로가기 버튼 */}
      <button onClick={onBack} style={{ 
        background: 'none', border: 'none', cursor: 'pointer', 
        display: 'inline-flex', alignItems: 'center', marginBottom: '24px', 
        color: 'var(--color-text-secondary)', fontSize: '15px', padding: 0,
        width: 'fit-content'
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        목록으로 돌아가기
      </button>

      {/* 본문 콘텐츠 (플렉스 그로우로 공간 차지) */}
      <div style={{ flex: 1 }}>
        {/* 태그 및 뱃지 영역 */}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {post.major_tag && <span className="badge">#{post.major_tag}</span>}
          {post.topic_tags?.map(tag => (
            <span key={tag} className="badge">#{tag}</span>
          ))}
          {post.reward && post.reward !== '없음' && (
            <span className="reward-badge" style={{ 
              padding: '4px 10px', borderRadius: '12px', fontSize: '13px', 
              backgroundColor: '#f5f5f5', color: '#555', border: '1px solid #ddd' 
            }}>
              🎁 {post.reward}
            </span>
          )}
        </div>

        {/* 제목 */}
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '20px', color: 'var(--color-text-primary)', wordBreak: 'keep-all' }}>
          {post.title}
        </h1>

        {/* 메타 정보 (작성자 및 작성일) */}
        <div style={{ 
          color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '32px', 
          paddingBottom: '16px', borderBottom: '1px solid var(--color-divider)', 
          display: 'flex', justifyContent: 'space-between' 
        }}>
          <span>{post.authorName || '익명'} ({post.grade_tag || post.authorGrade || '학년'})</span>
          <span>{new Date(post.created_at).toLocaleString('ko-KR')}</span>
        </div>

        {/* 본문 텍스트 */}
        <div style={{ fontSize: '16px', lineHeight: '1.7', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }}>
          {post.content || '본문 내용이 없습니다.'}
        </div>
      </div>

      {/* 하단 액션 버튼 (본문이 끝나는 지점 하단에 자연스럽게 배치) */}
      <div style={{ 
        marginTop: '80px', paddingTop: '32px', borderTop: '1px solid var(--color-divider)', 
        display: 'flex', justifyContent: 'center' 
      }}>
        {currentUser?.role === 'host' ? (
          <button style={{
            width: '100%',
            maxWidth: '400px',
            padding: '16px 20px',
            borderRadius: '12px',
            backgroundColor: 'var(--color-tag-bg)',
            color: 'var(--color-primary-orange)',
            border: '1px solid var(--color-primary-orange)',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}>
            💬 채팅 신청자 목록 보기
          </button>
        ) : (
          <button 
            onClick={() => setIsChatModalOpen(true)}
            style={{
            width: '100%',
            maxWidth: '400px',
            padding: '16px 20px',
            borderRadius: '12px',
            backgroundColor: 'var(--color-primary-cta)',
            color: '#fff',
            border: 'none',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(255, 90, 31, 0.2)',
            transition: 'all 0.2s'
          }}>
            🤝 1:1 채팅 신청하기
          </button>
        )}
      </div>

      <ChatRequestModal 
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        onSubmit={handleChatRequest}
      />
    </div>
  );
};

export default PostDetail;
