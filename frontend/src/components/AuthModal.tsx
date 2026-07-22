import { useState } from 'react';

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
  onLoginSuccess: (user: UserSession) => void;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !username.trim()) {
      setErrorMsg('이메일과 닉네임을 모두 입력해 주세요.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          username: username.trim(),
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        onLoginSuccess(result.data);
        onClose();
      } else {
        setErrorMsg(result.message || '로그인에 실패했습니다.');
      }
    } catch (err) {
      console.error('Auth submit error:', err);
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
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(5px)',
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
          maxWidth: '400px',
          background: '#0a0a0a',
          border: '2px solid #ffffff',
          padding: '32px 24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: '#ffffff',
            fontSize: '1.5rem',
            cursor: 'pointer',
          }}
        >
          &times;
        </button>

        <h2
          style={{
            fontSize: '1.4rem',
            fontWeight: 'bold',
            color: '#ffffff',
            marginBottom: '8px',
            textTransform: 'lowercase',
            fontFamily: 'monospace',
          }}
        >
          // user login
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#888888', marginBottom: '24px' }}>
          이메일과 닉네임으로 간편하게 로그인하세요.
        </p>

        {errorMsg && (
          <div
            style={{
              background: 'rgba(255, 51, 51, 0.1)',
              border: '1px solid #ff3333',
              color: '#ff3333',
              padding: '8px 12px',
              fontSize: '0.8rem',
              marginBottom: '16px',
            }}
          >
            {errorMsg}
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
              username:
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
            }}
          >
            {isLoading ? 'logging in...' : 'login / start'}
          </button>
        </form>
      </div>
    </div>
  );
}
