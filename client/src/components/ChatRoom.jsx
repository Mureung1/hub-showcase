import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import AppointmentModal from './AppointmentModal';

const ChatRoom = ({ room, onBack }) => {
  const { currentUser } = useAuth();
  const myRole = currentUser?.id === room?.host_id ? 'host' : 'helper';
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [appointment, setAppointment] = useState({
    status: 'NONE', // 'NONE' | 'PROPOSED' | 'CONFIRMED'
    location: '',
    time: '',
    proposedBy: ''
  });
  const scrollRef = useRef(null);

  // 컴포넌트 마운트 시 서버 API에서 메시지 및 약속 정보 불러오기
  useEffect(() => {
    const fetchRoomData = async () => {
      if (room && room.id) {
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          
          // 1. 메시지 내역 가져오기 & 수신 메시지 읽음(is_read: true) 상태로 로컬 보정
          const msgsRes = await fetch(`${API_URL}/api/chats/${room.id}/messages`);
          const msgsData = await msgsRes.json();
          if (Array.isArray(msgsData)) {
            const markedMsgs = msgsData.map(m => {
              if (m.sender !== myRole) {
                return { ...m, is_read: true };
              }
              return m;
            });
            setMessages(markedMsgs);
          }

          // 2. HTTP 읽음 처리 API 호출 (DB 상태 보존)
          if (myRole) {
            fetch(`${API_URL}/api/chats/${room.id}/read`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userRole: myRole })
            }).catch(e => console.error("HTTP markAsRead error", e));
          }

          // 3. 약속 정보 가져오기 및 세팅
          const chatRes = await fetch(`${API_URL}/api/chats/${room.id}`);
          const chatData = await chatRes.json();
          if (chatData) {
            setAppointment({
              status: chatData.appointment_status || 'NONE',
              location: chatData.appointment_location || '',
              time: chatData.appointment_time || '',
              proposedBy: chatData.appointment_proposed_by || ''
            });
          }
        } catch (e) {
          console.error("Failed to fetch room data", e);
        }
      }
    };
    fetchRoomData();
  }, [room, currentUser, myRole]);

  const socket = useSocket();

  // Socket.io 실시간 통신 연결
  useEffect(() => {
    if (socket && room && room.id) {
      socket.emit('joinRoom', room.id);

      if (myRole) {
        socket.emit('markAsRead', { roomId: room.id, userRole: myRole });
      }

      const handleReceiveMessage = (msg) => {
        setMessages(prev => [...prev, msg]);
        if (msg.sender !== myRole && myRole) {
          socket.emit('markAsRead', { roomId: room.id, userRole: myRole });
        }
      };

      const handleMessagesRead = ({ roomId }) => {
        if (room && room.id === roomId) {
          setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
        }
      };

      const handleAppointmentUpdated = ({ roomId, appointment: newAppt }) => {
        if (room && room.id === roomId) {
          setAppointment(newAppt);
        }
      };

      socket.on('receiveMessage', handleReceiveMessage);
      socket.on('messagesRead', handleMessagesRead);
      socket.on('appointmentUpdated', handleAppointmentUpdated);

      return () => {
        socket.off('receiveMessage', handleReceiveMessage);
        socket.off('messagesRead', handleMessagesRead);
        socket.off('appointmentUpdated', handleAppointmentUpdated);
      };
    }
  }, [socket, room, currentUser, myRole]);

  // 스크롤 이동
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, room]);

  // 메시지 전송 공통 함수
  const sendSystemOrUserMessage = (text, isSystem = false) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const sender = isSystem ? 'system' : myRole;

    const newMsg = { id: Date.now(), sender, text, time: timeStr, is_read: false };
    setMessages(prev => [...prev, newMsg]);

    if (socket && room && room.id) {
      socket.emit('sendMessage', { roomId: room.id, message: newMsg });
    }
  };

  const handleSend = () => {
    if (inputText.trim() === '') return;
    sendSystemOrUserMessage(inputText, false);
    setInputText('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── 약속 조율 액션 핸들러 ──
  // 1. 약속 제안 / 수정 제출
  const handleProposeAppointment = ({ location, time }) => {
    const newAppt = {
      status: 'PROPOSED',
      location,
      time,
      proposedBy: myRole
    };
    setAppointment(newAppt);

    if (socket && room?.id) {
      socket.emit('updateAppointment', { roomId: room.id, appointment: newAppt });
    }

    sendSystemOrUserMessage(`📢 새로운 약속이 제안되었습니다: ${location} (${time})`, true);
  };

  // 2. 상대방 약속 확정하기
  const handleConfirmAppointment = () => {
    const newAppt = {
      ...appointment,
      status: 'CONFIRMED'
    };
    setAppointment(newAppt);

    if (socket && room?.id) {
      socket.emit('updateAppointment', { roomId: room.id, appointment: newAppt });
    }

    sendSystemOrUserMessage(`🎉 약속이 최종 확정되었습니다! (${appointment.location} / ${appointment.time})`, true);
  };

  // 3. 약속 다시 정하기 (초기화)
  const handleResetAppointment = () => {
    const newAppt = {
      status: 'NONE',
      location: '',
      time: '',
      proposedBy: ''
    };
    setAppointment(newAppt);

    if (socket && room?.id) {
      socket.emit('updateAppointment', { roomId: room.id, appointment: newAppt });
    }

    sendSystemOrUserMessage(`🔄 '다시 정하기'가 요청되었습니다. 새로운 시간/장소를 제안해주세요.`, true);
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
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>익명 ({room?.partnerGrade || '학년'})</h2>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {room?.postTitle || '채팅방'}
          </div>
        </div>
      </div>

      {/* 2. 동적 약속 조율 상단 띠 배너 */}
      <div style={{ background: appointment.status === 'CONFIRMED' ? '#FFF3EC' : 'var(--color-bg-secondary)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-divider)', zIndex: 10, transition: 'all 0.3s' }}>
        
        {appointment.status === 'NONE' && (
          <>
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', wordBreak: 'keep-all' }}>
              구체적인 약속 일시와 장소를 제안해보세요.
            </span>
            <button 
              onClick={() => setIsAppointmentModalOpen(true)}
              style={{
                flexShrink: 0, marginLeft: '12px', padding: '8px 16px', borderRadius: '20px',
                backgroundColor: 'var(--color-primary-orange)', color: '#fff', border: 'none',
                fontSize: '14px', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              📅 약속 잡기
            </button>
          </>
        )}

        {appointment.status === 'PROPOSED' && (
          <>
            <div style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--color-primary-cta)' }}>
                📍 {appointment.proposedBy === myRole ? '제안중' : '약속 제안받음'}:
              </span> {appointment.location} ({appointment.time})
            </div>

            <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
              {appointment.proposedBy === myRole ? (
                // 내가 제안한 경우: 수정하기
                <button 
                  onClick={() => setIsAppointmentModalOpen(true)}
                  style={{
                    padding: '6px 12px', borderRadius: '16px', backgroundColor: '#fff',
                    color: 'var(--color-primary-cta)', border: '1px solid var(--color-primary-cta)',
                    fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
                  }}
                >
                  ✏️ 제안 수정
                </button>
              ) : (
                // 상대방이 제안한 경우: 확정하기 & 다시 정하기
                <>
                  <button 
                    onClick={handleConfirmAppointment}
                    style={{
                      padding: '6px 12px', borderRadius: '16px', backgroundColor: 'var(--color-primary-cta)',
                      color: '#fff', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
                    }}
                  >
                    ✅ 확정하기
                  </button>
                  <button 
                    onClick={handleResetAppointment}
                    style={{
                      padding: '6px 12px', borderRadius: '16px', backgroundColor: '#fff',
                      color: 'var(--color-text-secondary)', border: '1px solid var(--color-divider)',
                      fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
                    }}
                  >
                    🔄 다시 정하기
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {appointment.status === 'CONFIRMED' && (
          <>
            <div style={{ fontSize: '13px', color: 'var(--color-primary-cta)', fontWeight: 'bold' }}>
              🎉 확정된 약속: {appointment.location} | ⏰ {appointment.time}
            </div>
            <button 
              onClick={handleResetAppointment}
              style={{
                flexShrink: 0, marginLeft: '12px', padding: '6px 12px', borderRadius: '16px',
                backgroundColor: '#fff', color: 'var(--color-text-secondary)', border: '1px solid #ddd',
                fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              🔄 약속 다시 잡기
            </button>
          </>
        )}

      </div>

      {/* 3. 메시지 목록 영역 (스크롤) */}
      <div ref={scrollRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#F8F9FA' }}>
        {messages.map(msg => {
          if (msg.sender === 'system') {
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
                <span style={{ 
                  backgroundColor: '#FFF3EC', color: 'var(--color-primary-cta)', fontSize: '13px', 
                  fontWeight: 'bold', padding: '6px 14px', borderRadius: '16px', border: '1px solid #FFE4D6',
                  boxShadow: '0 2px 6px rgba(255, 90, 31, 0.08)'
                }}>
                  {msg.text}
                </span>
              </div>
            );
          }

          // 메시지의 발송자와 현재 화면을 보고 있는 사람의 역할이 같으면 '나'로 인식 (오른쪽 배치)
          const isMe = msg.sender === myRole;
          
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', flexDirection: isMe ? 'row' : 'row-reverse' }}>
                {/* 내가 보낸 메시지인데 아직 안 읽은 경우 숫자 1 표시 */}
                {isMe && !msg.is_read && (
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-primary-cta)', margin: '0 4px 2px 4px' }}>
                    1
                  </span>
                )}
                
                {/* 작성 시간 (말풍선 바깥쪽) */}
                <span style={{ fontSize: '11px', color: '#999', margin: '0 6px' }}>{msg.time}</span>
                
                {/* 말풍선 렌더링 */}
                <div style={{
                  maxWidth: '280px',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  backgroundColor: isMe ? 'var(--color-primary-orange)' : '#fff',
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

      {/* 5. 약속 잡기/수정 모달 */}
      <AppointmentModal 
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        onSubmit={handleProposeAppointment}
        initialLocation={appointment.location}
        initialTime={appointment.time}
      />
    </div>
  );
};

export default ChatRoom;
