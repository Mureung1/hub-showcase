import { colors } from '../styles/theme.js'

export default function Spinner({ size = 16 }) {
  return (
    <span
      role="status"
      aria-label="로딩 중"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: `${Math.max(2, Math.round(size / 6))}px solid ${colors.track}`,
        borderTopColor: colors.primary,
        borderRadius: '50%',
        animation: 'cjmt-spin 0.7s linear infinite',
      }}
    />
  )
}
