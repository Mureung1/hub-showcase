// 점수 밴드: 0–30 😢 / 31–60 😐 / 61–90 🙂 / 91–100 😍
const BANDS = [
  { max: 30, emoji: '😢', className: 'trust-badge--low' },
  { max: 60, emoji: '😐', className: 'trust-badge--mid' },
  { max: 90, emoji: '🙂', className: 'trust-badge--high' },
  { max: 100, emoji: '😍', className: 'trust-badge--top' },
]

export default function TrustBadge({ score }) {
  // pg numeric은 문자열로 오므로 Number 정규화 후 정수 반올림.
  const value = Math.round(Number(score) || 0)
  const band = BANDS.find((b) => value <= b.max) ?? BANDS[BANDS.length - 1]
  return (
    <span className={`trust-badge ${band.className}`}>
      <span aria-hidden="true">{band.emoji}</span> 신뢰도 <strong>{value}</strong>
    </span>
  )
}
