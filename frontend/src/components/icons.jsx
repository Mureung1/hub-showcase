export function HistoryIcon() {
  return (
    <svg viewBox="0 0 40 40" width="28" height="28" fill="none">
      <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="2.5" />
      <path d="M20 11v9l6 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function TargetIcon() {
  return (
    <svg viewBox="0 0 40 40" width="28" height="28" fill="none">
      <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="20" cy="20" r="8.5" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="20" cy="20" r="2.5" fill="currentColor" />
    </svg>
  )
}

export function SparkIcon() {
  return (
    <svg viewBox="0 0 40 40" width="28" height="28" fill="none">
      <path
        d="M20 6l3.2 9.3L32 18.5l-8.8 3.2L20 31l-3.2-9.3L8 18.5l8.8-3.2L20 6z"
        fill="currentColor"
      />
    </svg>
  )
}

export function BookIcon() {
  return (
    <svg viewBox="0 0 40 40" width="28" height="28" fill="none">
      <path
        d="M9 9c3-2 8-2 11 0v22c-3-2-8-2-11 0V9z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M31 9c-3-2-8-2-11 0v22c3-2 8-2 11 0V9z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function GrowthIcon() {
  return (
    <svg viewBox="0 0 40 40" width="28" height="28" fill="none">
      <path d="M7 27l7-8 6 5 11-13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 11h7v7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function NetworkIcon() {
  return (
    <svg viewBox="0 0 40 40" width="28" height="28" fill="none">
      <circle cx="20" cy="9" r="4" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="9" cy="30" r="4" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="31" cy="30" r="4" stroke="currentColor" strokeWidth="2.5" />
      <path d="M17 12.5L11.5 26.5M23 12.5L28.5 26.5M13 30h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function TrophyIcon() {
  return (
    <svg viewBox="0 0 40 40" width="28" height="28" fill="none">
      <path
        d="M13 8h14v8a7 7 0 0 1-14 0V8z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M13 10H8v3a5 5 0 0 0 5 5M27 10h5v3a5 5 0 0 1-5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 23v5M15 32h10M16.5 28h7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

// FirstPR 로고 마크 — git pull request 심볼 (favicon.svg와 동일 형태, 색은 부모에서 currentColor로 지정)
export function LogoMark() {
  return (
    <svg viewBox="0 0 48 48" width="19" height="19" fill="none">
      <g stroke="currentColor" strokeWidth="4.2" strokeLinecap="round">
        <circle cx="17" cy="14.5" r="3.8" />
        <path d="M17 19v10" />
        <circle cx="17" cy="33.5" r="3.8" />
        <path d="M23.5 14.5h3.1a4.4 4.4 0 0 1 4.4 4.4v10.1" />
        <circle cx="31" cy="33.5" r="3.8" />
      </g>
    </svg>
  )
}

// 재검색 버튼용 순환 화살표 아이콘. className으로 로딩 중 회전 애니메이션(.spin)을 얹을 수 있다
export function RefreshIcon({ className }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" className={className}>
      <path
        d="M3.5 8a4.5 4.5 0 0 1 7.6-3.2L13 6.5M13 3.5v3.5h-3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 8a4.5 4.5 0 0 1-7.6 3.2L3 9.5M3 12.5V9h3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 돌아가기 화살표 (텍스트 화살표 문자 대체 — 폰트에 따라 모양이 달라지지 않도록 SVG로 고정)
export function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
      <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
