import { NUTRIENT_LABELS } from '../lib/nutrition.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

// AI가 함께 준 "1인분 예상 섭취량"(expected)을 짧은 한 줄로 요약. 없거나 형식이 어긋나면 표시 생략.
function formatExpected(expected) {
  if (!expected || typeof expected !== 'object') return null

  const parts = NUTRIENT_LABELS.filter(({ key }) => typeof expected[key] === 'number').map(
    ({ key, label, unit }) => `${label} ${Math.round(expected[key])}${unit}`,
  )

  return parts.length > 0 ? `${parts.join(' · ')} 섭취 가능` : null
}

export default function MenuRecommendation({ recommendations }) {
  if (!recommendations || recommendations.length === 0) return null

  return (
    <div>
      {recommendations.map((item, i) => {
        const expectedText = formatExpected(item.expected)

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
