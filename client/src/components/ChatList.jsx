import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ChatList = ({ onSelectChat }) => {
  const { currentUser } = useAuth();
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API_URL}/api/chats`);
        const data = await res.json();
        
        if (Array.isArray(data)) {
          const mappedRooms = data.map(r => ({
            id: r.id,
            postId: r.post_id,
            postTitle: r.post_title,
            partnerName: (currentUser && currentUser.id === r.host_id) ? r.helper_name : r.host_name,
            partnerGrade: r.partner_grade,
            lastMessage: r.last_message,
            lastTime: r.last_time,
            host_id: r.host_id,
            helper_id: r.helper_id,
            unreadCount: r.unreadCount || 0
          }));
          setRooms(mappedRooms);
        } else {
          console.error("Failed to load chats, API returned:", data);
          setRooms([]);
        }
      } catch (e) {
        console.error("Failed to fetch chat rooms", e);
      }
    };
    fetchRooms();
  }, []);

  return (
    <div className="feed-column" style={{ background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-divider)', minHeight: '600px', padding: '24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>1:1 대화</h2>
      
      {rooms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '100px 20px', color: '#888' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>💬</div>
          참여 중인 대화가 없습니다.<br/>커뮤니티에서 도움을 제안해보세요!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {rooms.map(room => (
            <div 
              key={room.id} 
              onClick={() => onSelectChat(room)}
              style={{ 
                display: 'flex', alignItems: 'center', padding: '16px', 
                border: '1px solid var(--color-divider)', borderRadius: '12px', 
                cursor: 'pointer', transition: 'background 0.2s' 
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fff'}
            >
              {/* 프로필 아바타 */}
              <div style={{ 
                width: '52px', height: '52px', borderRadius: '26px', 
                backgroundColor: 'var(--color-tag-bg)', color: 'var(--color-primary-orange)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: '24px', marginRight: '16px', flexShrink: 0
              }}>
                👤
              </div>
              
              {/* 대화방 정보 */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '16px' }}>익명</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    <span style={{ fontSize: '12px', color: '#999' }}>{room.lastTime || ''}</span>
                    {room.unreadCount > 0 && (
                      <span style={{ 
                        backgroundColor: 'var(--color-primary-cta)', 
                        color: '#fff', 
                        fontSize: '11px', 
                        fontWeight: 'bold', 
                        padding: '2px 7px', 
                        borderRadius: '10px' 
                      }}>
                        {room.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ 
                  fontSize: '14px', color: 'var(--color-text-secondary)', 
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' 
                }}>
                  {room.lastMessage || '대화 내역이 없습니다.'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatList;
