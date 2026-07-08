import { colors, spacing, styles } from '../styles/theme.js'

export default function MapPage() {
  return (
    <div style={styles.page}>
      <h1>지도</h1>
      <div style={{ ...styles.card, textAlign: 'center', padding: `${spacing.xxxl}px ${spacing.xl}px` }}>
        <p style={{ color: colors.textSub }}>준비 중입니다. 곧 만나요!</p>
      </div>
    </div>
  )
}
