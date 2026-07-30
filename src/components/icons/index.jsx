// 공용 아이콘 모듈.
//
// lucide-react가 설치돼 있지 않아(번들 비용 때문에 의도적으로 미도입 — Pressable.jsx가 같은 이유로
// framer-motion을 뺀 것과 같은 판단), Lucide의 path를 같은 규약(24x24 viewBox, currentColor,
// round cap/join)으로 직접 옮겨 적는다. 예전엔 이 규약이 BottomTabBar.jsx의 로컬 Icon,
// ChevronIcon.jsx, AnalysisResultCard/MealsPage의 인라인 SVG로 3중 복제돼 있었다 — 여기로 모은다.
//
// 두 가지 형태가 있다:
//   Icon      — 선(stroke)만. 탭바·셰브론처럼 단색으로 쓰는 곳.
//   DuotoneIcon — 채움(낮은 불투명도) + 선의 2톤. MY 탭 바로가기 타일처럼 아이콘이 주인공인 곳.
// 둘 다 색은 currentColor라, 쓰는 쪽에서 style.color 하나만 주면 두 톤이 함께 따라온다.

const FILL_OPACITY = 0.22

export function Icon({ size = 24, strokeWidth = 1.8, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// solid는 currentColor로 옅게 채우고, line은 그 위에 또렷한 선으로 얹는다.
function DuotoneIcon({ size = 26, solid, line }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g fill="currentColor" fillOpacity={FILL_OPACITY} stroke="none">
        {solid}
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {line}
      </g>
    </svg>
  )
}

// ── 탭바 (lucide: camera / utensils / calendar / map-pin / user) ────────────────

export function CameraIcon() {
  return (
    <Icon>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </Icon>
  )
}

export function UtensilsIcon() {
  return (
    <Icon>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </Icon>
  )
}

export function CalendarIcon() {
  return (
    <Icon>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </Icon>
  )
}

export function MapPinIcon() {
  return (
    <Icon>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </Icon>
  )
}

export function UserIcon() {
  return (
    <Icon>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Icon>
  )
}

// ── 내비게이션 ────────────────────────────────────────────────────────────────

// 뒤로가기 전용. 화살표(←)가 아니라 셰브론(<)이고, 시인성을 위해 하우스 기본 1.8보다 굵다.
export function ChevronLeftIcon({ size = 24, strokeWidth = 2.5 }) {
  return (
    <Icon size={size} strokeWidth={strokeWidth}>
      <polyline points="15 18 9 12 15 6" />
    </Icon>
  )
}

// ── MY 탭 바로가기 (lucide: target / trophy / award / lightbulb / droplet / pill /
//    bar-chart-3 / settings) ────────────────────────────────────────────────────

export function TargetIcon({ size }) {
  return (
    <DuotoneIcon
      size={size}
      solid={<circle cx="12" cy="12" r="6" />}
      line={
        <>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </>
      }
    />
  )
}

export function TrophyIcon({ size }) {
  return (
    <DuotoneIcon
      size={size}
      solid={<path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />}
      line={
        <>
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </>
      }
    />
  )
}

export function AwardIcon({ size }) {
  return (
    <DuotoneIcon
      size={size}
      solid={<circle cx="12" cy="8" r="6" />}
      line={
        <>
          <circle cx="12" cy="8" r="6" />
          <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
        </>
      }
    />
  )
}

export function LightbulbIcon({ size }) {
  return (
    <DuotoneIcon
      size={size}
      solid={<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5Z" />}
      line={
        <>
          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
          <path d="M9 18h6" />
          <path d="M10 22h4" />
        </>
      }
    />
  )
}

export function DropletIcon({ size }) {
  const drop = 'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z'
  return <DuotoneIcon size={size} solid={<path d={drop} />} line={<path d={drop} />} />
}

export function PillIcon({ size }) {
  return (
    <DuotoneIcon
      size={size}
      solid={<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />}
      line={
        <>
          <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
          <path d="m8.5 8.5 7 7" />
        </>
      }
    />
  )
}

export function BarChartIcon({ size }) {
  return (
    <DuotoneIcon
      size={size}
      solid={
        <>
          <rect x="6.6" y="13" width="3" height="5" rx="1.2" />
          <rect x="11.6" y="8" width="3" height="10" rx="1.2" />
          <rect x="16.6" y="4.5" width="3" height="13.5" rx="1.2" />
        </>
      }
      line={
        <>
          <path d="M3 3v18h18" />
          <path d="M8.1 18v-5" />
          <path d="M13.1 18V8" />
          <path d="M18.1 18V4.5" />
        </>
      }
    />
  )
}

export function SettingsIcon({ size }) {
  const gear =
    'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z'
  return (
    <DuotoneIcon
      size={size}
      solid={<path d={gear} />}
      line={
        <>
          <path d={gear} />
          <circle cx="12" cy="12" r="3" />
        </>
      }
    />
  )
}
