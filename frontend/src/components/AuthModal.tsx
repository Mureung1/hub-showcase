import { useState, useEffect } from 'react';

export interface UserSession {
  id: string;
  email: string;
  username: string;
  points: number;
  accuracyRate: number;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserSession, token?: string) => void;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Reset errors and fields on mode change
  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setErrorMsg('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    if (mode === 'register') {
      if (!username.trim()) {
        setErrorMsg('닉네임을 입력해 주세요.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('비밀번호는 최소 6자 이상이어야 합니다.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://dropcast-jh37.onrender.com/api';
      const endpoint = mode === 'login' 
        ? `${API_BASE}/auth/login`
        : `${API_BASE}/auth/register`;

      const payload = mode === 'login' 
        ? { email: email.trim(), password }
        : { email: email.trim(), username: username.trim(), password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        if (result.token) {
          localStorage.setItem('dropcast_token', result.token);
        }
        setSuccessMsg(result.message || (mode === 'login' ? '로그인되었습니다.' : '가입되었습니다!'));
        
        setTimeout(() => {
          onLoginSuccess(result.data, result.token);
          onClose();
        }, 800);
      } else {
        setErrorMsg(result.message || '요청 처리 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setErrorMsg('서버와 통신하지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '420px',
          background: '#0a0a0a',
          border: '2px solid #ffffff',
          padding: '32px 24px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.9)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: '#888888',
            fontSize: '1.5rem',
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          &times;
        </button>

        {/* Tab Header */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #222222', paddingBottom: '12px' }}>
          <button
            type="button"
            onClick={() => switchMode('login')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.1rem',
              fontWeight: mode === 'login' ? 'bold' : 'normal',
              color: mode === 'login' ? '#d4ff00' : '#666666',
              cursor: 'pointer',
              textTransform: 'lowercase',
              fontFamily: 'monospace',
              padding: 0,
            }}
          >
            // login
          </button>
          <span style={{ color: '#333333' }}>|</span>
          <button
            type="button"
            onClick={() => switchMode('register')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.1rem',
              fontWeight: mode === 'register' ? 'bold' : 'normal',
              color: mode === 'register' ? '#d4ff00' : '#666666',
              cursor: 'pointer',
              textTransform: 'lowercase',
              fontFamily: 'monospace',
              padding: 0,
            }}
          >
            // sign up
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', color: '#888888', marginBottom: '20px' }}>
          {mode === 'login'
            ? '등록된 이메일과 비밀번호로 로그인하세요.'
            : '새 계정을 생성하고 초기 1,000 포인트를 받으세요.'}
        </p>

        {errorMsg && (
          <div
            style={{
              background: 'rgba(255, 51, 51, 0.12)',
              border: '1px solid #ff3333',
              color: '#ff3333',
              padding: '10px 12px',
              fontSize: '0.8rem',
              marginBottom: '16px',
            }}
          >
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: 'rgba(212, 255, 0, 0.12)',
              border: '1px solid #d4ff00',
              color: '#d4ff00',
              padding: '10px 12px',
              fontSize: '0.8rem',
              marginBottom: '16px',
            }}
          >
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                color: '#aaaaaa',
                marginBottom: '6px',
                fontFamily: 'monospace',
              }}
            >
              email address:
            </label>
            <input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#161616',
                border: '1px solid #444444',
                color: '#ffffff',
                fontSize: '0.9rem',
                borderRadius: '0px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {mode === 'register' && (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: '#aaaaaa',
                  marginBottom: '6px',
                  fontFamily: 'monospace',
                }}
              >
                username (nickname):
              </label>
              <input
                type="text"
                placeholder="nickname"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#161616',
                  border: '1px solid #444444',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  borderRadius: '0px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                color: '#aaaaaa',
                marginBottom: '6px',
                fontFamily: 'monospace',
              }}
            >
              password:
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#161616',
                border: '1px solid #444444',
                color: '#ffffff',
                fontSize: '0.9rem',
                borderRadius: '0px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {mode === 'register' && (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: '#aaaaaa',
                  marginBottom: '6px',
                  fontFamily: 'monospace',
                }}
              >
                confirm password:
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#161616',
                  border: '1px solid #444444',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  borderRadius: '0px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '12px',
              padding: '12px 0',
              background: '#d4ff00',
              color: '#000000',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '0.95rem',
              cursor: 'pointer',
              borderRadius: '0px',
              textTransform: 'lowercase',
              transition: 'opacity 0.2s ease',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading
              ? (mode === 'login' ? 'logging in...' : 'registering...')
              : (mode === 'login' ? 'login' : 'create account (+1,000 pts)')}
          </button>
        </form>
      </div>
    </div>
  );
}
