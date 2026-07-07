import { colors, styles } from '../styles/theme.js'

export default function MenuRecommendation({ recommendations }) {
  if (!recommendations || recommendations.length === 0) return null

  return (
    <div>
      {recommendations.map((item, i) => (
        <div key={i} style={styles.card}>
          <h3>{item.name}</h3>
          <p style={{ margin: 0, color: colors.textMuted }}>{item.reason}</p>
        </div>
      ))}
    </div>
  )
}
