import Pressable from './Pressable.jsx'
import { colors, styles } from '../styles/theme.js'

// flat: 그림자 대신 얇은 회색 테두리를 쓰는 변형(스펙: "옅은 그림자 또는 얇은 회색 테두리")
// onClick을 주면 "카드형 리스트 아이템"이 되어 프레스 피드백이 붙는다(PRD v2.0 FR-4.1의 적용 대상).
// 면적이 큰 카드는 0.96이 과하게 눌리는 느낌이라 0.98로 완화한다.
export default function Card({ children, flat = false, style, onClick, ...rest }) {
  const cardStyle = {
    ...styles.card,
    boxShadow: flat ? 'none' : styles.card.boxShadow,
    border: flat ? `1px solid ${colors.border}` : 'none',
    ...style,
  }

  if (onClick) {
    return (
      <Pressable as="div" role="button" tabIndex={0} scale={0.98} onClick={onClick} style={{ ...cardStyle, cursor: 'pointer' }} {...rest}>
        {children}
      </Pressable>
    )
  }

  return (
    <div style={cardStyle} {...rest}>
      {children}
    </div>
  )
}
