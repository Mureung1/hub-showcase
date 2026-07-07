import { colors, spacing, styles } from '../styles/theme.js'

export default function DeficiencyBar({ label, unit, recommended, actual, deficiency, highlighted }) {
  const isDeficient = deficiency > 0
  const percent = recommended > 0 ? Math.min(100, Math.round((actual / recommended) * 100)) : 0
  const color = isDeficient ? colors.deficient : colors.primary

  return (
    <div
      style={{
        ...styles.card,
        border: highlighted ? `2px solid ${color}` : styles.card.border,
        background: highlighted ? colors.deficientSurface : colors.surface,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.xs }}>
        <span>
          {label}
          {highlighted && ' · 부족 상위'}
        </span>
        <span>
          {actual} / {recommended} {unit}
        </span>
      </div>
      <div style={{ height: 10, background: colors.track, borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: color }} />
      </div>
    </div>
  )
}
