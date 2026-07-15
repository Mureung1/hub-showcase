import { colors, font, spacing } from '../styles/theme.js'

export default function SectionTitle({ children, style }) {
  return (
    <h2
      style={{
        fontSize: font.size.xl,
        fontWeight: 700,
        color: colors.textStrong,
        margin: `${spacing.xl}px 0 ${spacing.md}px`,
        ...style,
      }}
    >
      {children}
    </h2>
  )
}
