import { colors, font, radius, spacing, styles } from '../styles/theme.js'

const NUTRIENT_LABELS = [
  { key: 'calories', label: '열량', unit: 'kcal' },
  { key: 'protein', label: '단백질', unit: 'g' },
  { key: 'carbs', label: '탄수화물', unit: 'g' },
  { key: 'fat', label: '지방', unit: 'g' },
  { key: 'fiber', label: '식이섬유', unit: 'g' },
  { key: 'sodium', label: '나트륨', unit: 'mg' },
]

function NutrientList({ nutrients }) {
  return (
    <div>
      {NUTRIENT_LABELS.map(({ key, label, unit }) => (
        <div
          key={key}
          style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: colors.body }}
        >
          <span>{label}</span>
          <span style={{ fontWeight: 700, color: colors.title }}>
            {nutrients[key]}
            <span style={{ fontWeight: 400, color: colors.muted, marginLeft: 2 }}>{unit}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

export default function NutritionCard({ analysis }) {
  if (!analysis) return null

  return (
    <div style={{ marginTop: spacing.lg }}>
      {analysis.items.map((item, i) => (
        <div key={i} style={styles.card}>
          <div
            style={{
              width: '100%',
              height: 96,
              borderRadius: radius.sm,
              background: colors.background,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              marginBottom: spacing.lg,
            }}
          >
            🍽️
          </div>
          <h3 style={{ fontSize: font.size.lg }}>
            {item.name}
            {item.brand ? ` (${item.brand})` : ''}
          </h3>
          <NutrientList nutrients={item.nutrients} />
        </div>
      ))}

      <div style={{ ...styles.card, background: colors.primarySurface, boxShadow: 'none' }}>
        <h3 style={{ color: colors.primary }}>합계</h3>
        <NutrientList nutrients={analysis.total} />
      </div>
    </div>
  )
}
