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
    <div style={{ marginTop: 24 }}>
      {analysis.items.map((item, i) => (
        <div key={i} style={{ padding: 16, border: '1px solid #e0e0e0', borderRadius: 8, marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>
            {item.name}
            {item.brand ? ` (${item.brand})` : ''}
          </h3>
          <NutrientList nutrients={item.nutrients} />
        </div>
      ))}

      <div style={{ padding: 16, border: '2px solid #2e7d32', borderRadius: 8 }}>
        <h3 style={{ marginTop: 0 }}>합계</h3>
        <NutrientList nutrients={analysis.total} />
      </div>
    </div>
  )
}
