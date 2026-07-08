import { colors, font, styles } from '../styles/theme.js'

export default function MenuRecommendation({ recommendations }) {
  if (!recommendations || recommendations.length === 0) return null

  return (
    <div>
      {recommendations.map((item, i) => (
        <div key={i} style={styles.card}>
          <h3 style={{ fontSize: font.size.md, color: colors.title }}>{item.name}</h3>
          <p style={{ margin: 0, color: colors.muted, fontSize: font.size.sm, lineHeight: 1.5 }}>{item.reason}</p>
        </div>
      ))}
    </div>
  )
}
