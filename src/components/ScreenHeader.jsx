import { colors, font, spacing } from '../styles/theme.js'

export default function ScreenHeader({ title, subtitle, onBack }) {
  return (
    <div style={{ marginBottom: spacing.xl }}>
      {onBack && (
        <button
          type="button"
          className="tds-press"
          onClick={onBack}
          aria-label="뒤로가기"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            marginBottom: spacing.sm,
            fontSize: 20,
            color: colors.textStrong,
            cursor: 'pointer',
          }}
        >
          ←
        </button>
      )}
      <h1 style={{ fontSize: font.size.title, margin: 0, fontWeight: 800, color: colors.textStrong }}>{title}</h1>
      {subtitle && (
        <p style={{ marginTop: spacing.xs, color: colors.textSub, fontSize: font.size.md }}>{subtitle}</p>
      )}
    </div>
  )
}
