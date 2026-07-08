import Card from './Card.jsx'
import { colors, font, radius, spacing } from '../styles/theme.js'

// max는 진단(RDA) 값이 아니라, 막대 시각화를 위한 "한 끼 기준" 참고 상한값이다.
const NUTRIENT_LABELS = [
  { key: 'calories', label: '열량', unit: 'kcal', max: 900 },
  { key: 'protein', label: '단백질', unit: 'g', max: 40 },
  { key: 'carbs', label: '탄수화물', unit: 'g', max: 100 },
  { key: 'fat', label: '지방', unit: 'g', max: 35 },
  { key: 'fiber', label: '식이섬유', unit: 'g', max: 15 },
  { key: 'sodium', label: '나트륨', unit: 'mg', max: 2000 },
]

function NutrientBars({ nutrients }) {
  return (
    <div>
      {NUTRIENT_LABELS.map(({ key, label, unit, max }) => {
        const value = nutrients[key]
        const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0

        return (
          <div key={key} style={{ marginBottom: spacing.md }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.xs }}>
              <span style={{ color: colors.textSub, fontSize: font.size.sm }}>{label}</span>
              <span style={{ fontWeight: 700, color: colors.textStrong, fontSize: font.size.sm }}>
                {value}
                <span style={{ fontWeight: 400, color: colors.muted, marginLeft: 2 }}>{unit}</span>
              </span>
            </div>
            <div style={{ height: 6, background: colors.track, borderRadius: radius.pill, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${percent}%`,
                  height: '100%',
                  background: colors.primary,
                  borderRadius: radius.pill,
                  transition: 'width 0.3s ease-out',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SourceBadge({ brand }) {
  const isOfficial = Boolean(brand)

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: font.size.xs,
        fontWeight: 700,
        padding: '3px 10px',
        borderRadius: radius.pill,
        background: isOfficial ? colors.primarySurface : colors.bg,
        color: isOfficial ? colors.primary : colors.textSub,
        marginBottom: spacing.sm,
      }}
    >
      {isOfficial ? '공식 영양표' : '표준 조리법 기반 추정'}
    </span>
  )
}

export default function NutritionCard({ analysis }) {
  if (!analysis) return null

  return (
    <div style={{ marginTop: spacing.lg }}>
      {analysis.items.map((item, i) => (
        <Card key={i}>
          <div
            style={{
              width: '100%',
              height: 96,
              borderRadius: radius.sm,
              background: colors.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              marginBottom: spacing.lg,
            }}
          >
            🍽️
          </div>
          <div>
            <SourceBadge brand={item.brand} />
          </div>
          <h3 style={{ fontSize: font.size.lg, margin: `0 0 ${spacing.md}px` }}>
            {item.name}
            {item.brand ? ` (${item.brand})` : ''}
          </h3>
          <NutrientBars nutrients={item.nutrients} />
        </Card>
      ))}

      <Card style={{ background: colors.primarySurface, boxShadow: 'none' }}>
        <h3 style={{ color: colors.primary, margin: `0 0 ${spacing.md}px` }}>합계</h3>
        <NutrientBars nutrients={analysis.total} />
      </Card>
    </div>
  )
}
