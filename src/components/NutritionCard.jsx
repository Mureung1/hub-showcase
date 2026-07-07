import { colors, spacing, styles } from '../styles/theme.js'

const NUTRIENT_LABELS = [
  { key: 'calories', label: '칼로리', unit: 'kcal' },
  { key: 'protein', label: '단백질', unit: 'g' },
  { key: 'carbs', label: '탄수화물', unit: 'g' },
  { key: 'fat', label: '지방', unit: 'g' },
  { key: 'fiber', label: '식이섬유', unit: 'g' },
  { key: 'sodium', label: '나트륨', unit: 'mg' },
]

function NutrientList({ nutrients }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {NUTRIENT_LABELS.map(({ key, label, unit }) => (
        <li key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
          <span>{label}</span>
          <span>
            {nutrients[key]} {unit}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function NutritionCard({ analysis }) {
  if (!analysis) return null

  return (
    <div style={{ marginTop: spacing.lg }}>
      {analysis.items.map((item, i) => (
        <div key={i} style={styles.card}>
          <h3>
            {item.name}
            {item.brand ? ` (${item.brand})` : ''}
          </h3>
          <NutrientList nutrients={item.nutrients} />
        </div>
      ))}

      <div style={{ ...styles.card, border: `2px solid ${colors.primary}` }}>
        <h3>합계</h3>
        <NutrientList nutrients={analysis.total} />
      </div>
    </div>
  )
}
