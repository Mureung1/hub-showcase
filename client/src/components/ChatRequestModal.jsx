import React, { useState } from 'react';

const ChatRequestModal = ({ isOpen, onClose, onSubmit }) => {
  const [message, setMessage] = useState('');
  const maxLength = 50;

  if (!isOpen) return null;

  const handleChange = (e) => {
    const text = e.target.value;
    if (text.length <= maxLength) {
      setMessage(text);
    }
  };

  const handleSubmit = () => {
    if (message.trim().length === 0) return;
    onSubmit(message);
    setMessage('');
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%', margin: 'auto' }}>
        <div className="modal-header">
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>첫 인사 건네기</h2>
          <button className="icon-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className="modal-body" style={{ marginTop: '16px' }}>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
            방장에게 도움을 제안하는 가벼운 인사를 남겨주세요.
          </p>
          <div style={{ position: 'relative' }}>
            <textarea 
              value={message}
              onChange={handleChange}
              placeholder="예: 안녕하세요! 제가 근처라 바로 도와드릴 수 있어요."
              style={{
                width: '100%',
                height: '100px',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--color-divider)',
                resize: 'none',
                fontSize: '15px',
                fontFamily: 'inherit'
              }}
            />
            <div style={{ 
              position: 'absolute', 
              bottom: '12px', 
              right: '12px', 
              fontSize: '12px', 
              color: message.length === maxLength ? 'red' : '#888' 
            }}>
              {message.length} / {maxLength}
            </div>
          </div>
        </div>

        <div className="modal-actions" style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
          <button 
            onClick={onClose}
            style={{ 
              flex: 1, 
              padding: '12px', 
              borderRadius: '8px', 
              border: '1px solid var(--color-divider)', 
              background: '#fff', 
              fontWeight: 'bold',
              cursor: 'pointer' 
            }}
          >
            취소
          </button>
          <button 
            onClick={handleSubmit}
            disabled={message.trim().length === 0}
            style={{ 
              flex: 1, 
              padding: '12px', 
              borderRadius: '8px', 
              border: 'none', 
              background: message.trim().length === 0 ? '#ccc' : 'var(--color-primary-cta)', 
              color: '#fff', 
              fontWeight: 'bold',
              cursor: message.trim().length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            전송하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatRequestModal;
