import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../api/supabaseClient';
import ChatRequestModal from './ChatRequestModal';
import EditPostModal from './EditPostModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PostDetail = ({ post, onBack, onStartChat, onChatCreated, onPostDeleted, onPostEdited }) => {
  const { currentUser } = useAuth();
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [hasChats, setHasChats] = useState(false);

  // 신청 목록 관련 상태
  const [requests, setRequests] = useState([]);
  const [myRequest, setMyRequest] = useState(null);

  const isAuthor = currentUser?.id === post.author_id;

  useEffect(() => {
    if (post.id) {
      const checkChats = async () => {
        try {
          const res = await fetch(`${API_URL}/api/posts/${post.id}/has-chats`);
          if (res.ok) {
            const data = await res.json();
            setHasChats(data.hasChats);
          }
        } catch (err) {
          console.error("Failed to check chats", err);
        }
      };

      const fetchRequests = async () => {
        try {
          const res = await fetch(`${API_URL}/api/posts/${post.id}/requests`);
          if (res.ok) {
            const data = await res.json();
            setRequests(data);
            if (currentUser) {
              const mine = data.find(r => String(r.helper_id) === String(currentUser.id));
              if (mine) setMyRequest(mine);
            }
          }
        } catch (err) {
          console.error("Failed to fetch requests", err);
        }
      };

      checkChats();
      fetchRequests();
    }
  }, [post.id, currentUser]);

  const handleDelete = async () => {
    if (hasChats || requests.length > 0) return alert('채팅 신청자가 있거나 진행 중인 채팅방이 있어 삭제할 수 없습니다.');
    if (!window.confirm('정말로 이 고민글을 삭제하시겠습니까?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${API_URL}/api/posts/${post.id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) throw new Error('삭제 실패');
      alert('게시글이 삭제되었습니다.');
      if (onPostDeleted) onPostDeleted();
      onBack();
    } catch (err) {
      alert('게시글 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleEditClick = () => {
    if (hasChats || requests.length > 0) return alert('채팅 신청자가 있거나 진행 중인 채팅방이 있어 수정할 수 없습니다.');
    setIsEditModalOpen(true);
  };

  const handleChatRequest = async (message) => {
    setIsChatModalOpen(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${API_URL}/api/posts/${post.id}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message
        })
      });
      if (res.ok) {
        alert('채팅 신청이 완료되었습니다! 방장이 수락하면 대화가 시작됩니다.');
        const data = await res.json();
        setRequests(prev => [...prev, data]);
        setMyRequest(data);
      } else {
        const errorData = await res.json();
        alert(errorData.error || '신청에 실패했습니다.');
      }
    } catch (e) {
      alert('신청 중 오류가 발생했습니다.');
    }
  };

  const handleAcceptRequest = async (req) => {
    if (hasChats) return alert('이미 수락한 채팅방이 있습니다.');
    if (!window.confirm(`이 지원자의 신청을 수락하고 1:1 대화를 시작하시겠습니까?`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${API_URL}/api/posts/${post.id}/requests/${req.id}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          post_title: post.title
        })
      });
      if (!res.ok) throw new Error('수락 실패');
      const chat = await res.json();

      alert('채팅방이 생성되었습니다!');
      if (onChatCreated) onChatCreated(chat);
    } catch (err) {
      alert('수락 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="feed-column" style={{
      background: '#fff',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-divider)',
      padding: '32px',
      position: 'relative',
      minHeight: '600px',
      display: 'flex',
      flexDirection: 'column'
    }}>
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

      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(post.major_tag || post.author_major) && (post.major_tag !== '미상' && post.author_major !== '미상') && (
            <span className="badge">#{post.major_tag || post.author_major}</span>
          )}
          {post.tags && post.tags.length > 0 ? (
            post.tags
              .filter(tag => tag !== post.major_tag && tag !== post.author_major && tag !== post.grade_tag && tag !== post.author_grade)
              .map(tag => (
                <span key={tag} className="badge">#{tag}</span>
              ))
          ) : post.topic_tags?.map(tag => (
            <span key={tag} className="badge">#{tag}</span>
          ))}
          {post.reward && post.reward !== '없음' && (
            <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>🎁 {post.reward}</span>
          )}
        </div>

        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="bullet-icon"></span>
          {post.title}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid var(--color-divider)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-primary-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '20px', marginRight: '16px' }}>
            {'익'}
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--color-text-primary)' }}>
              익명
            </div>
            <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              {post.created_at ? new Date(post.created_at).toLocaleString() : '방금 전'}
            </div>
          </div>
        </div>

        <div style={{ fontSize: '16px', lineHeight: '1.8', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', marginBottom: '40px' }}>
          {post.content}
        </div>

        {/* 방장일 때: 신청 목록 표시 */}
        {isAuthor && requests.length > 0 && !hasChats && (
          <div style={{ marginTop: '24px', borderTop: '2px solid var(--color-divider)', paddingTop: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
              📩 도착한 채팅 신청 ({requests.length}명)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {requests.map(req => (
                <div key={req.id} style={{
                  padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px',
                  border: '1px solid var(--color-divider)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px', color: 'var(--color-primary)' }}>
                    익명님의 신청 메시지
                  </div>
                  <p style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#374151', lineHeight: '1.6' }}>
                    {req.message}
                  </p>
                  <button
                    onClick={() => handleAcceptRequest(req)}
                    style={{
                      padding: '10px 20px', backgroundColor: 'var(--color-primary)', color: 'white',
                      border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
                      transition: 'background 0.2s'
                    }}>
                    ✨ 수락하고 채팅 시작하기
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단 액션 버튼 */}
      <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', borderTop: '1px solid var(--color-divider)', paddingTop: '24px' }}>
        {isAuthor ? (
          <>
            <button
              onClick={handleEditClick}
              disabled={hasChats || requests.length > 0}
              title={(hasChats || requests.length > 0) ? "채팅 신청자가 있거나 진행 중인 채팅이 있어 수정 불가" : ""}
              style={{
                width: '100%', maxWidth: '200px', padding: '16px 20px', borderRadius: '12px',
                backgroundColor: (hasChats || requests.length > 0) ? '#f3f4f6' : 'var(--color-primary-orange)',
                color: (hasChats || requests.length > 0) ? '#9ca3af' : '#fff',
                border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: (hasChats || requests.length > 0) ? 'not-allowed' : 'pointer',
              }}>
              ✏️ 글 수정
            </button>
            <button
              onClick={handleDelete}
              disabled={hasChats || requests.length > 0}
              title={(hasChats || requests.length > 0) ? "채팅 신청자가 있거나 진행 중인 채팅이 있어 삭제 불가" : ""}
              style={{
                width: '100%', maxWidth: '200px', padding: '16px 20px', borderRadius: '12px',
                backgroundColor: (hasChats || requests.length > 0) ? '#f3f4f6' : '#fff',
                color: (hasChats || requests.length > 0) ? '#9ca3af' : '#EF4444',
                border: `1px solid ${(hasChats || requests.length > 0) ? '#d1d5db' : '#EF4444'}`,
                fontSize: '16px', fontWeight: 'bold', cursor: (hasChats || requests.length > 0) ? 'not-allowed' : 'pointer',
              }}>
              🗑️ 글 삭제
            </button>
            {(hasChats || requests.length > 0) && (
              <div style={{ position: 'absolute', bottom: '0', fontSize: '13px', color: '#9ca3af', marginTop: '10px' }}>
                * 채팅 신청자가 있거나 수락한 채팅방이 진행 중이어서 수정/삭제가 불가능합니다.
              </div>
            )}
          </>
        ) : (
          <button
            onClick={() => {
              if (!currentUser) return alert('로그인이 필요합니다.');
              if (myRequest) return alert('이미 신청했습니다. 방장의 수락을 기다려주세요.');
              if (hasChats) return alert('이미 이 글의 1:1 대화가 진행 중이어서 신청할 수 없습니다.');
              setIsChatModalOpen(true);
            }}
            disabled={!!myRequest || hasChats}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '16px 20px',
              borderRadius: '12px',
              backgroundColor: (myRequest || hasChats) ? '#f3f4f6' : 'var(--color-primary-cta)',
              color: (myRequest || hasChats) ? '#9ca3af' : '#fff',
              border: (myRequest || hasChats) ? '1px solid #e5e7eb' : 'none',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: (myRequest || hasChats) ? 'not-allowed' : 'pointer',
              boxShadow: (myRequest || hasChats) ? 'none' : '0 4px 12px rgba(255, 90, 31, 0.2)',
              transition: 'all 0.2s'
            }}>
            {hasChats ? '🔒 이미 매칭이 완료된 고민글입니다' : myRequest ? '⏳ 채팅 신청 완료 (방장 수락 대기중)' : '🤝 1:1 채팅 신청하기'}
          </button>
        )}
      </div>

      <ChatRequestModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        onSubmit={handleChatRequest}
      />

      <EditPostModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={post}
        onPostEdited={() => {
          setIsEditModalOpen(false);
          if (onPostEdited) onPostEdited();
        }}
      />
    </div>
  );
};

export default PostDetail;
