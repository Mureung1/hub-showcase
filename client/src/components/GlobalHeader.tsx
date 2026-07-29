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
        <button className="nav-item" onClick={() => alert(lang === 'KO' ? '준비 중인 기능입니다.' : 'Coming soon.')}>Discover</button>
        <button className="nav-item" onClick={() => alert(lang === 'KO' ? '준비 중인 기능입니다.' : 'Coming soon.')}>Settings</button>
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
          <div className="user-profile-group">
            <div className="user-profile" title={userName}>
              {userAvatar ? (
                <img 
                  src={userAvatar} 
                  alt={userName} 
                  className="user-avatar"
                />
              ) : (
                <span className="user-icon" role="img" aria-label="user">👤</span>
              )}
            </div>
            <button 
              className="auth-btn"
              onClick={signOut}
            >
              {lang === 'KO' ? '로그아웃' : 'Logout'}
            </button>
          </div>
        ) : (
          <button 
            className="auth-btn"
            onClick={signInWithGoogle}
          >
            {lang === 'KO' ? 'Google 로그인' : 'Sign in with Google'}
          </button>
        )}
      </div>
    </header>
  );
}

export default GlobalHeader;
