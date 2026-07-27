import React from 'react';
import { useAuth } from '../context/AuthContext';

interface GlobalHeaderProps {
  lang: 'KO' | 'EN';
  setLang: React.Dispatch<React.SetStateAction<'KO' | 'EN'>>;
  currentView: 'dashboard' | 'library';
  setCurrentView: React.Dispatch<React.SetStateAction<'dashboard' | 'library'>>;
}

function GlobalHeader({ lang, setLang, currentView, setCurrentView }: GlobalHeaderProps) {
  const { user, signInWithGoogle, signOut } = useAuth();

  const userAvatar = user?.user_metadata?.avatar_url;
  const userName = user?.user_metadata?.full_name || user?.email || 'User';

  return (
    <header className="global-header">
      <div className="header-left">
        <span className="brand-logo" role="img" aria-label="sparkles">✨</span>
        <h1 className="brand-title">Scholar-Sync AI</h1>
      </div>
      
      <nav className="header-nav">
        <button 
          className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentView('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`nav-item ${currentView === 'library' ? 'active' : ''}`}
          onClick={() => setCurrentView('library')}
        >
          My Library
        </button>
        <button className="nav-item">Discover</button>
        <button className="nav-item">Settings</button>
      </nav>
      
      <div className="header-right">
        <button 
          id="lang-toggle-btn"
          className="lang-toggle" 
          onClick={() => setLang(lang === 'KO' ? 'EN' : 'KO')}
        >
          🌐 {lang === 'KO' ? 'KO / EN' : 'EN / KO'}
        </button>

        {user ? (
          <div className="user-profile-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {userAvatar ? (
              <img 
                src={userAvatar} 
                alt={userName} 
                className="user-avatar"
                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <span className="user-icon" role="img" aria-label="user">👤</span>
            )}
            <span className="user-name" style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-color)' }}>
              {userName}
            </span>
            <button 
              className="auth-btn logout-btn"
              onClick={signOut}
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              로그아웃
            </button>
          </div>
        ) : (
          <button 
            className="auth-btn login-btn"
            onClick={signInWithGoogle}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-bg, #ffffff)',
              cursor: 'pointer',
              color: 'var(--text-color)'
            }}
          >
            <span>🌐</span> Google 로그인
          </button>
        )}
      </div>
    </header>
  );
}

export default GlobalHeader;
