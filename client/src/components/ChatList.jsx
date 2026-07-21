import React, { useState, useEffect } from 'react';

const ChatList = ({ onSelectChat }) => {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    try {
      // 로컬 스토리지에서 생성된 채팅방 목록 불러오기
      const stored = localStorage.getItem('mock_chat_rooms');
      if (stored && stored !== 'undefined') {
        const storedRooms = JSON.parse(stored);
        // 최신 대화 순으로 보여주기 위해 뒤집기 (가장 최근 방이 위로)
        setRooms(storedRooms.reverse());
      }
    } catch (e) {
      console.error("Failed to parse mock_chat_rooms", e);
      localStorage.removeItem('mock_chat_rooms');
    }
  }, []);

  return (
    <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-divider)', minHeight: '600px', padding: '24px' }}>
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
                    <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{room.partnerName || '익명'}</span>
                    <span style={{ fontSize: '12px', color: 'var(--color-primary-cta)', backgroundColor: '#fff', border: '1px solid var(--color-primary-cta)', padding: '2px 6px', borderRadius: '8px' }}>
                      {room.partnerGrade || '학년'}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#999', flexShrink: 0 }}>{room.lastTime || ''}</span>
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
