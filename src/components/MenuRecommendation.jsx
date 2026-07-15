import { useVisibleNutrients } from '../lib/cardSettings.js'
import { formatExpectedIntake } from '../lib/nutrition.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

// item.expected(AI가 계산한 1인분 예상 섭취량) 자체는 표시 설정과 무관하게 그대로 두고, 화면에
// 그릴 텍스트를 만들 때만 켜진 영양소로 걸러낸다.
export default function MenuRecommendation({ recommendations }) {
  const visible = useVisibleNutrients()
  if (!recommendations || recommendations.length === 0) return null

  return (
    <div>
      {recommendations.map((item, i) => {
        const visibleExpected =
          item.expected && Object.fromEntries(Object.entries(item.expected).filter(([key]) => visible[key]))
        const expectedText = formatExpectedIntake(visibleExpected)

        return (
          <div key={i} style={styles.card}>
            <h3 style={{ fontSize: font.size.md, color: colors.title }}>{item.name}</h3>
            <p style={{ margin: 0, color: colors.muted, fontSize: font.size.sm, lineHeight: 1.5 }}>{item.reason}</p>
            {expectedText && (
              <p style={{ margin: `${spacing.sm}px 0 0`, color: colors.primary, fontSize: font.size.xs, fontWeight: 600 }}>
                {expectedText}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
