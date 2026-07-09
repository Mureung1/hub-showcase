import Card from './Card.jsx'
import MealTypeBadge from './MealTypeBadge.jsx'
import SourceBadge from './SourceBadge.jsx'
import { NUTRIENT_LABELS } from '../lib/nutrition.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// 막대 시각화를 위한 "한 끼 기준" 참고 상한값(진단 RDA가 아님). 이 컴포넌트 전용 표시 스케일이라 로컬로 둔다.
const BAR_MAX = {
  calories: 900,
  protein: 40,
  carbs: 100,
  fat: 35,
  fiber: 15,
  sodium: 2000,
}

// 식단 탭의 "자세한 영양" 아코디언에서도 재사용하는 상세 막대 그래프
export function NutrientBars({ nutrients }) {
  return (
    <div>
      {NUTRIENT_LABELS.map(({ key, label, unit }) => {
        const value = nutrients[key]
        const max = BAR_MAX[key]
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
          <div style={{ marginBottom: spacing.sm, display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
            <SourceBadge source={item.source} />
            {item.mealType && <MealTypeBadge mealType={item.mealType} />}
          </div>
          <h3 style={{ fontSize: font.size.lg, margin: `0 0 ${spacing.md}px` }}>{item.name}</h3>
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
