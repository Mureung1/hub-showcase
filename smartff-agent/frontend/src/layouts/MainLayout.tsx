import { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';

const colors = {
  navBg: '#1E293B',
  navIconActive: '#60A5FA',
  navIconInactive: '#94A3B8',
  navLabelActive: '#93C5FD',
  bgPrimary: '#F8FAFC',
  bgCard: '#FFFFFF',
  borderColor: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
};

type NavItem = {
  id: string;
  path: string;
  label: string;
  icon: (color: string) => React.ReactNode;
};

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    path: '/dashboard',
    label: '대시보드',
    icon: (color) => (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="2" fill={color} />
        <rect x="13" y="3" width="8" height="8" rx="2" fill={color} opacity="0.5" />
        <rect x="3" y="13" width="8" height="8" rx="2" fill={color} opacity="0.5" />
        <rect x="13" y="13" width="8" height="8" rx="2" fill={color} opacity="0.5" />
      </svg>
    ),
  },
  {
    id: 'analysis',
    path: '/analysis',
    label: '분석',
    icon: (color) => (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <path d="M4 20V10M12 20V4M20 20V13" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'financial',
    path: '/financial',
    label: '재무',
    icon: (color) => (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="2.2" />
        <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>
          ₩
        </text>
      </svg>
    ),
  },
  {
    id: 'upload',
    path: '/upload',
    label: '업로드',
    icon: (color) => (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <path d="M12 16V4M12 4l-4 4M12 4l4 4" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 20h14" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function MainLayout() {
  const location = useLocation();
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowProfilePopover(false);
      }
    }

    if (showProfilePopover) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProfilePopover]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: colors.bgPrimary }}>
      {/* Icon Rail Sidebar */}
      <aside
        style={{
          width: '76px',
          flexShrink: 0,
          background: colors.navBg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '22px 0',
          gap: '28px',
          position: 'fixed',
          height: '100vh',
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: '#2563EB',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '800',
            fontSize: '13px',
          }}
        >
          SF
        </div>

        {/* Nav Items */}
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const iconColor = isActive ? colors.navIconActive : colors.navIconInactive;
          return (
            <Link
              key={item.id}
              to={item.path}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                alignItems: 'center',
                textDecoration: 'none',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: isActive ? 'rgba(37,99,235,0.22)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {item.icon(iconColor)}
              </div>
              {isActive && (
                <span
                  style={{
                    fontSize: '9.5px',
                    color: colors.navLabelActive,
                    fontWeight: '700',
                  }}
                >
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}

        {/* Profile */}
        <div style={{ position: 'relative', marginTop: 'auto' }} ref={popoverRef}>
          <button
            onClick={() => setShowProfilePopover(!showProfilePopover)}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: '#475569',
              border: '1px solid #64748B',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              padding: 0,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#64748B';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#475569';
            }}
          >
            관
          </button>

          {showProfilePopover && (
            <div
              style={{
                position: 'absolute',
                bottom: '48px',
                right: '-160px',
                width: '160px',
                background: colors.bgCard,
                border: `1px solid ${colors.borderColor}`,
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
                zIndex: 1000,
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: '700', color: colors.textPrimary, marginBottom: '4px' }}>
                GS25 강남역점
              </div>
              <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                관리자
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: '76px', flex: 1, minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}
