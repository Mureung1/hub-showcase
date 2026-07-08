import { colors, spacing } from '../styles/theme.js'

export default function Divider({ style }) {
  return (
    <hr
      style={{
        border: 'none',
        borderTop: `1px solid ${colors.border}`,
        margin: `${spacing.lg}px 0`,
        ...style,
      }}
    />
  )
}
