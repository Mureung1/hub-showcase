import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// 로그인 모달 컴포넌트
const LoginModal = ({ isOpen, onClose, onSwitchToSignUp }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // 로그인 폼 초기화
  const resetForm = () => {
    setUsername('');
    setPassword('');
    setError('');
    setIsSubmitting(false);
  };

  // 로그인 처리
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(username, password);
      resetForm();
      onClose();
    } catch (err) {
      setError(err.message || '아이디 또는 비밀번호가 올바르지 않습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 모달 닫기
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 회원가입으로 전환
  const handleSwitchToSignUp = () => {
    resetForm();
    onSwitchToSignUp();
  };

  const isFormValid = username.trim().length > 0 && password.length > 0;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '420px',
          width: '90%',
          padding: '32px',
          borderRadius: 'var(--radius-lg)',
          background: '#fff',
          position: 'relative'
        }}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'none', border: 'none', fontSize: '20px',
            cursor: 'pointer', color: 'var(--color-text-tertiary)'
          }}
        >✕</button>

        {/* 제목 */}
        <h2 style={{
          fontSize: '22px', fontWeight: 'bold', textAlign: 'center',
          marginBottom: '28px', color: 'var(--color-text-primary)'
        }}>
          <span style={{ color: 'var(--color-primary-orange)' }}>meetry</span> 로그인
        </h2>

        <form onSubmit={handleLogin}>
          {/* 아이디 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>
              아이디
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디를 입력하세요"
              autoComplete="username"
              style={{
                width: '100%', padding: '12px 14px', fontSize: '14px',
                border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-sm)',
                outline: 'none', transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary-orange)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-divider)'}
            />
          </div>

          {/* 비밀번호 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              style={{
                width: '100%', padding: '12px 14px', fontSize: '14px',
                border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-sm)',
                outline: 'none', transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary-orange)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-divider)'}
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div style={{
              padding: '10px 14px', marginBottom: '16px',
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 'var(--radius-sm)', color: '#DC2626',
              fontSize: '13px', textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            style={{
              width: '100%', padding: '14px', fontSize: '15px', fontWeight: 'bold',
              color: '#fff',
              backgroundColor: isFormValid && !isSubmitting ? 'var(--color-primary-cta)' : '#ccc',
              border: 'none', borderRadius: 'var(--radius-sm)',
              cursor: isFormValid && !isSubmitting ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s'
            }}
          >
            {isSubmitting ? '로그인 중...' : '🔑 로그인'}
          </button>
        </form>

        {/* 회원가입 안내 */}
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          계정이 없으신가요?{' '}
          <button
            onClick={handleSwitchToSignUp}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-primary-orange)', fontWeight: 'bold',
              fontSize: '13px', textDecoration: 'underline'
            }}
          >
            회원가입
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginModal;
