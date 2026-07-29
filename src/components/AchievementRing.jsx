import { colors } from '../styles/theme.js'

// Result.jsx의 달성률 링에서 추출한 공용 SVG 진행 링(FR-14) — stroke-dashoffset 전환은 이 프로젝트가
// 예외적으로 허용하는 SVG paint-only 애니메이션(transform/opacity 외 허용된 두 곳 중 하나, CLAUDE.md
// 참고). LevelUpPopup(FR-14)·WaterIntakeCard(FR-20)가 재사용한다.
export default function AchievementRing({ percent, size = 160, strokeWidth = 14, children }) {
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - Math.max(0, Math.min(100, percent)) / 100)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children ?? <span style={{ fontSize: 30, fontWeight: 800, color: colors.title }}>{percent}%</span>}
      </div>
    </div>
  )
}
