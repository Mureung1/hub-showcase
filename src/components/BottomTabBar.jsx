import { useLocation, useNavigate } from 'react-router-dom'
import { colors, font, layout, spacing } from '../styles/theme.js'

// lucide-react가 설치돼 있지 않아, 같은 스타일(24x24, stroke=currentColor, 2px)의
// 간단한 SVG 아이콘을 직접 그린다.
function Icon({ children }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

function CameraIcon() {
  return (
    <Icon>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </Icon>
  )
}

function UtensilsIcon() {
  return (
    <Icon>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </Icon>
  )
}

function CalendarIcon() {
  return (
    <Icon>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </Icon>
  )
}

function MapPinIcon() {
  return (
    <Icon>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </Icon>
  )
}

function UserIcon() {
  return (
    <Icon>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Icon>
  )
}

const TABS = [
  { key: 'home', label: '홈', path: '/analyze', match: (p) => p.startsWith('/analyze') || p.startsWith('/result'), Icon: CameraIcon },
  { key: 'meals', label: '식단', path: '/meals', match: (p) => p.startsWith('/meals'), Icon: UtensilsIcon },
  { key: 'calendar', label: '달력', path: '/calendar', match: (p) => p.startsWith('/calendar'), Icon: CalendarIcon },
  { key: 'map', label: '지도', path: '/map', match: (p) => p.startsWith('/map'), Icon: MapPinIcon },
  { key: 'my', label: 'MY', path: '/profile', match: (p) => p.startsWith('/profile'), Icon: UserIcon },
]

export default function BottomTabBar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        background: colors.surface,
        borderTop: `1px solid ${colors.border}`,
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 20,
      }}
    >
      <div style={{ maxWidth: layout.shellMaxWidth, margin: '0 auto', display: 'flex' }}>
        {TABS.map(({ key, label, path, match, Icon: TabIcon }) => {
          const active = match(location.pathname)
          const color = active ? colors.primary : colors.muted

          return (
            <button
              key={key}
              type="button"
              className="tds-press"
              onClick={() => navigate(path)}
              aria-current={active ? 'page' : undefined}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                padding: `${spacing.sm}px 0`,
                background: 'none',
                border: 'none',
                color,
                cursor: 'pointer',
              }}
            >
              <TabIcon />
              <span style={{ fontSize: font.size.xs, fontWeight: active ? 700 : 500 }}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
