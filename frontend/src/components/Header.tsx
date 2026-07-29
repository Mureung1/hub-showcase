import { Link, NavLink, useLocation } from 'react-router-dom';
import { UserSession } from './AuthModal';

interface HeaderProps {
  userSession: UserSession | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export default function Header({
  userSession,
  onOpenAuthModal,
  onLogout,
}: HeaderProps) {
  const location = useLocation();

  return (
    <>
      {/* Top Bar */}
      <div className="top-bar">
        based on crowd consensus // forecasting next week's alternative drops // version 1.0.0
      </div>

      {/* GNB Header */}
      <header>
        <Link to="/upcoming" className="logo">
          dropcast*
        </Link>

        <nav className="nav-filters">
          {[
            { path: '/upcoming', label: 'upcoming 🗳️', alias: '/' },
            { path: '/released', label: 'hot & released 📈' },
            { path: '/ranking', label: 'ranking 🏆' },
          ].map(({ path, label, alias }) => {
            const isActive =
              location.pathname === path || (alias && location.pathname === alias);
            return (
              <NavLink
                key={path}
                to={path}
                className={`filter-tab ${isActive ? 'active' : ''}`}
              >
                {label}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {userSession ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontFamily: 'monospace' }}>
              <span style={{ color: '#ffffff', fontWeight: 'bold' }}>👤 {userSession.username}</span>
              <span style={{ color: '#d4ff00', background: '#1a1a1a', border: '1px solid #d4ff00', padding: '2px 8px' }}>
                💰 {userSession.points.toLocaleString()} pts
              </span>
              <button
                onClick={onLogout}
                style={{
                  background: 'transparent',
                  color: '#888888',
                  border: '1px solid #444444',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  borderRadius: '0px',
                  textTransform: 'lowercase'
                }}
              >
                logout
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              style={{
                background: '#d4ff00',
                color: '#000000',
                border: 'none',
                padding: '8px 16px',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                cursor: 'pointer',
                borderRadius: '0px',
                textTransform: 'lowercase'
              }}
            >
              login / register
            </button>
          )}
        </div>
      </header>
    </>
  );
}

