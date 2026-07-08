import { colors, styles } from '../styles/theme.js'

// flat: 그림자 대신 얇은 회색 테두리를 쓰는 변형(스펙: "옅은 그림자 또는 얇은 회색 테두리")
export default function Card({ children, flat = false, style, ...rest }) {
  return (
    <div
      style={{
        ...styles.card,
        boxShadow: flat ? 'none' : styles.card.boxShadow,
        border: flat ? `1px solid ${colors.border}` : 'none',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
