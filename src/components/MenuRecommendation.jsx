import { formatExpectedIntake } from '../lib/nutrition.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

export default function MenuRecommendation({ recommendations }) {
  if (!recommendations || recommendations.length === 0) return null

  return (
    <div>
      {recommendations.map((item, i) => {
        const expectedText = formatExpectedIntake(item.expected)

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
