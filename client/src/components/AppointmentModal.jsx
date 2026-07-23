import React, { useState, useEffect } from 'react';

const AppointmentModal = ({ isOpen, onClose, onSubmit, initialLocation = '', initialTime = '' }) => {
  const [location, setLocation] = useState(initialLocation);
  const [time, setTime] = useState(initialTime);

  useEffect(() => {
    setLocation(initialLocation);
    setTime(initialTime);
  }, [initialLocation, initialTime, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!location.trim()) return alert('약속 장소를 입력해주세요.');
    if (!time.trim()) return alert('약속 일시를 입력해주세요.');

    onSubmit({ location: location.trim(), time: time.trim() });
    onClose();
  };

  return (
    <div className="modal-backdrop active" onClick={onClose}>
      <div className="modal-view active" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', height: 'auto', borderRadius: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>📅 약속 장소 및 시간 제안</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>약속 장소</label>
            <input 
              type="text" 
              placeholder="예: 공학관 1층 카페, 학생회관 앞"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', fontSize: '14px', borderRadius: '10px',
                border: '1px solid var(--color-divider)', outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>약속 일시</label>
            <input 
              type="text" 
              placeholder="예: 오늘 17:00, 내일 점심 12:30"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', fontSize: '14px', borderRadius: '10px',
                border: '1px solid var(--color-divider)', outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>취소</button>
            <button type="submit" style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'var(--color-primary-cta)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
              약속 제안하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentModal;
