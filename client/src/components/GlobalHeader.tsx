import React from 'react';

interface GlobalHeaderProps {
  lang: 'KO' | 'EN';
  setLang: React.Dispatch<React.SetStateAction<'KO' | 'EN'>>;
}

function GlobalHeader({ lang, setLang }: GlobalHeaderProps) {
  return (
    <header className="global-header">
      <div className="header-left">
        <span className="brand-logo" role="img" aria-label="sparkles">✨</span>
        <h1 className="brand-title">Scholar-Sync AI</h1>
      </div>
      
      <nav className="header-nav">
        <button className="nav-item active">Dashboard</button>
        <button className="nav-item">My Library</button>
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
