import React from 'react';

interface GlobalHeaderProps {
  lang: 'KO' | 'EN';
  setLang: React.Dispatch<React.SetStateAction<'KO' | 'EN'>>;
  currentView: 'dashboard' | 'library';
  setCurrentView: React.Dispatch<React.SetStateAction<'dashboard' | 'library'>>;
}

function GlobalHeader({ lang, setLang, currentView, setCurrentView }: GlobalHeaderProps) {
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
        <div className="user-profile">
          <span className="user-icon" role="img" aria-label="user">👤</span>
        </div>
      </div>
    </header>
  );
}

export default GlobalHeader;
