const DEFICIENT_COLOR = '#e67e22'
const SATISFIED_COLOR = '#2e7d32'

export default function DeficiencyBar({ label, unit, recommended, actual, deficiency, highlighted }) {
  const isDeficient = deficiency > 0
  const percent = recommended > 0 ? Math.min(100, Math.round((actual / recommended) * 100)) : 0
  const color = isDeficient ? DEFICIENT_COLOR : SATISFIED_COLOR

  return (
    <div
      style={{
        marginBottom: 16,
        padding: 12,
        borderRadius: 8,
        border: highlighted ? `2px solid ${color}` : '1px solid #e0e0e0',
        background: highlighted ? '#fff8f0' : 'transparent',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span>
          {label}
          {highlighted && ' · 부족 상위'}
        </span>
        <span>
          {actual} / {recommended} {unit}
        </span>
      </div>
      <div style={{ height: 10, background: '#eee', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: color }} />
      </div>
    </div>
  )
}
