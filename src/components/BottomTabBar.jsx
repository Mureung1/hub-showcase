import { useLocation } from 'react-router-dom'
import Pressable from './Pressable.jsx'
import { CalendarIcon, CameraIcon, MapPinIcon, UserIcon, UtensilsIcon } from './icons/index.jsx'
import { TABS } from '../lib/tabs.js'
import { useTabTransition } from '../lib/useTabTransition.js'
import { colors, font, layout, spacing } from '../styles/theme.js'

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
      // tds-tabbar: 탭 전환 애니메이션에서 이 바를 제외한다(index.css). 이게 없으면 화면 전체
      // 스냅샷에 딸려가 탭을 옮길 때마다 탭바가 밀려났다 들어오며 깜빡이는 것처럼 보인다.
      className="tds-tabbar"
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
