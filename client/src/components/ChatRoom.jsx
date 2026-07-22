import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const ChatRoom = ({ room, onBack }) => {
  const { currentUser } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef(null);

  // 컴포넌트 마운트 시 서버 API에서 해당 방의 메시지 내역 불러오기
  useEffect(() => {
    const fetchMessages = async () => {
      if (room && room.id) {
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          const res = await fetch(`${API_URL}/api/chats/${room.id}/messages`);
          const data = await res.json();
          if (Array.isArray(data)) {
            setMessages(data);
          } else {
            console.error("Failed to load messages, API returned:", data);
            setMessages([]);
          }
        } catch (e) {
          console.error("Failed to fetch chat messages", e);
        }
      }
    };
    fetchMessages();
  }, [room]);

  const socket = useSocket();

  // Socket.io 실시간 통신 연결 (joinRoom 및 receiveMessage)
  useEffect(() => {
    if (socket && room && room.id) {
      socket.emit('joinRoom', room.id);

      const handleReceiveMessage = (msg) => {
        setMessages(prev => [...prev, msg]);
      };

      socket.on('receiveMessage', handleReceiveMessage);

      return () => {
        socket.off('receiveMessage', handleReceiveMessage);
      };
    }
  }, [socket, room]);

  // 메시지 업데이트 시 스크롤만 맨 아래로 이동 (저장은 서버에서 처리됨)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, room]);

  // 전송 버튼 클릭 시 로직
  const handleSend = () => {
    if (inputText.trim() === '') return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    
    const newMsg = { id: Date.now(), sender: currentUser?.role || 'helper', text: inputText, time: timeStr };
    
    setMessages(prev => [...prev, newMsg]);
    setInputText(''); // 입력창 초기화

    // 실시간 메시지 발송
    if (socket && room && room.id) {
      socket.emit('sendMessage', { roomId: room.id, message: newMsg });
    }
  };

  // 엔터키 전송 지원 (Shift+Enter는 줄바꿈)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // 줄바꿈 방지
      handleSend();
    }
  };

  return (
    <div className="feed-column" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-divider)', overflow: 'hidden' }}>
      
      {/* 1. 상단 헤더 영역 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--color-divider)', background: '#fff', zIndex: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', marginRight: '12px', display: 'flex', alignItems: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>{room?.partnerName || '익명'} ({room?.partnerGrade || '학년'})</h2>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {room?.postTitle || '채팅방'}
          </div>
        </div>
      </div>

      {/* 2. 특수 액션 띠 배너 */}
      <div style={{ background: 'var(--color-bg-secondary)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-divider)', zIndex: 10 }}>
        <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', wordBreak: 'keep-all' }}>
          {currentUser?.role === 'host' ? '도움이 끝났다면 약속을 완료해주세요.' : '방장에게 구체적인 시간과 장소를 제안해보세요.'}
        </span>
        <button style={{
          flexShrink: 0,
          marginLeft: '12px',
          padding: '8px 16px',
          borderRadius: '20px',
          backgroundColor: currentUser?.role === 'host' ? 'var(--color-primary-orange)' : '#fff',
          color: currentUser?.role === 'host' ? '#fff' : 'var(--color-primary-orange)',
          border: '1px solid var(--color-primary-orange)',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}>
          {currentUser?.role === 'host' ? '✅ 약속 완료' : '📅 약속 잡기'}
        </button>
      </div>

      {/* 3. 메시지 목록 영역 (스크롤) */}
      <div ref={scrollRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#F8F9FA' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px', fontSize: '12px', color: '#999' }}>
          대화가 시작되었습니다. 서로 존중하는 채팅 문화를 만들어주세요.
        </div>
        
        {messages.map(msg => {
          // 메시지의 발송자와 현재 화면을 보고 있는 사람의 역할이 같으면 '나'로 인식 (오른쪽 배치)
          const isMe = msg.sender === currentUser?.role;
          
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', flexDirection: isMe ? 'row' : 'row-reverse' }}>
                {/* 작성 시간 (말풍선 바깥쪽) */}
                <span style={{ fontSize: '11px', color: '#999', margin: '0 6px' }}>{msg.time}</span>
                
                {/* 말풍선 렌더링 */}
                <div style={{
                  maxWidth: '280px',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  backgroundColor: isMe ? 'var(--color-primary-orange)' : '#fff',
                  // 글자색을 무조건 검은색 계열로 고정하여 가독성 개선
                  color: 'var(--color-text-primary)',
                  border: isMe ? 'none' : '1px solid var(--color-divider)',
                  borderTopRightRadius: isMe ? '4px' : '16px',
                  borderTopLeftRadius: isMe ? '16px' : '4px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  fontSize: '15px',
                  lineHeight: '1.5',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. 하단 텍스트 입력 영역 */}
      <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid var(--color-divider)', display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', padding: '8px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        
        <textarea 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="메시지를 입력하세요 (Enter로 전송)"
          rows={1}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '20px',
            border: '1px solid var(--color-divider)',
            background: 'var(--color-bg-secondary)',
            resize: 'none',
            fontSize: '15px',
            fontFamily: 'inherit',
            outline: 'none',
            minHeight: '44px',
            maxHeight: '100px'
          }}
        />
        
        <button 
          onClick={handleSend}
          disabled={inputText.trim() === ''}
          style={{ 
            background: inputText.trim() === '' ? '#E0E0E0' : 'var(--color-primary-orange)', 
            border: 'none', 
            borderRadius: '50%', 
            width: '44px', 
            height: '44px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: inputText.trim() === '' ? 'not-allowed' : 'pointer',
            color: '#fff',
            transition: 'background 0.2s',
            flexShrink: 0
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '-2px' }}>
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>

    </div>
  );
};

export default ChatRoom;
