// respec 브랜드 마크 — public/favicon.svg 와 동일한 모노그램 'r' 타일.
// 헤더 등 앱 내부에서 인라인 SVG로 쓴다(파비콘과 시각 일치). 옆의 "respec" 텍스트가
// 이름 역할을 하므로 이 마크는 장식(aria-hidden)으로 둔다.
function BrandMark({ size = 28 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="rs-brand-mark"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id="respecBrandTile"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#3a5be3" />
          <stop offset="0.52" stopColor="#8b3ff2" />
          <stop offset="1" stopColor="#1fe0cf" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#respecBrandTile)" />
      <g
        fill="none"
        stroke="#ffffff"
        strokeWidth="9.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M26 21 V46" />
        <path d="M26 31 Q 29.5 22.5 41 24" />
      </g>
    </svg>
  )
}

export default BrandMark
