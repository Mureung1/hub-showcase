import { formatNutrient } from '../lib/nutrition.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

export default function DeficiencyBar({ label, unit, recommended, actual, deficiency, highlighted }) {
  const isDeficient = deficiency > 0
  const percent = recommended > 0 ? Math.min(100, Math.round((actual / recommended) * 100)) : 0
  const color = isDeficient ? colors.deficient : colors.satisfied

  return (
    <div
      style={{
        ...styles.card,
        background: highlighted ? colors.deficientSurface : colors.surface,
        boxShadow: highlighted ? 'none' : styles.card.boxShadow,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, fontWeight: 600, color: colors.title }}>
          {label}
          {highlighted && (
            <span
              style={{
                fontSize: font.size.xs,
                fontWeight: 700,
                color: colors.deficient,
                background: '#fff',
                borderRadius: radius.pill,
                padding: '2px 8px',
              }}
            >
              부족 상위
            </span>
          )}
        </span>
        <span style={{ color: colors.body, fontSize: font.size.sm }}>
          {formatNutrient(actual)} / {formatNutrient(recommended)} {unit}
        </span>
      </div>
      <div style={{ height: 8, background: colors.track, borderRadius: radius.pill, overflow: 'hidden' }}>
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            background: color,
            borderRadius: radius.pill,
            transition: 'width 0.3s ease-out',
          }}
        />
      </div>
    </div>
  )
}
