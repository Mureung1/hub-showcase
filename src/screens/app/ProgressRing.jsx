// SVG 원형 진행률 링 — 대시보드(전체)·프로젝트 진행(내 진행률) 공용
export default function ProgressRing({ percent, size = 116, stroke = 13 }) {
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - Math.min(100, Math.max(0, percent)) / 100)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`진행률 ${percent}%`}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--color-primary-light)" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--color-primary-dark)" strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="ring-label">
        {percent}%
      </text>
    </svg>
  )
}
