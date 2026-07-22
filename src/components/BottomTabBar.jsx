import { useLocation } from 'react-router-dom'
import Pressable from './Pressable.jsx'
import { TABS } from '../lib/tabs.js'
import { useTabTransition } from '../lib/useTabTransition.js'
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

// 탭 순서/경로는 lib/tabs.js가 단일 소스다(화면 전환 방향 계산이 같은 순서를 봐야 하므로).
// 아이콘만 여기서 키에 붙인다.
const TAB_ICONS = {
  home: CameraIcon,
  meals: UtensilsIcon,
  calendar: CalendarIcon,
  map: MapPinIcon,
  my: UserIcon,
}

export default function BottomTabBar() {
  const location = useLocation()
  // 탭 인덱스를 비교해 슬라이드 방향을 정하고, 전환 중 중복 클릭을 무시한다(FR-4.2).
  const navigateWithTransition = useTabTransition()

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
        {TABS.map(({ key, label, path, match }) => {
          const TabIcon = TAB_ICONS[key]
          const active = match(location.pathname)
          const color = active ? colors.primary : colors.muted

          return (
            <Pressable
              key={key}
              type="button"
              onClick={() => navigateWithTransition(path)}
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
              {/* 선택될 때 1회 바운스(FR-4.1). key에 active를 섞어 두면 선택 상태가 바뀌는 순간
                  React가 노드를 새로 만들어 CSS 애니메이션이 처음부터 다시 재생된다 — 별도의
                  타이머나 상태 없이 "선택 시 1회"가 정확히 나온다. */}
              <span key={active ? 'on' : 'off'} className={active ? 'tds-tab-bounce' : undefined} style={{ display: 'block' }}>
                <TabIcon />
              </span>
              <span style={{ fontSize: font.size.xs, fontWeight: active ? 700 : 500 }}>{label}</span>
            </Pressable>
          )
        })}
      </div>
    </nav>
  )
}
