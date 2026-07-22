import Pressable from './Pressable.jsx'
import { styles } from '../styles/theme.js'

// 주요 액션 버튼. 프레스 피드백은 Pressable 한 곳에서만 정의된다(PRD v2.0 FR-4.1 — 개별 컴포넌트가
// 각자 scale 애니메이션을 갖지 않는다).
const VARIANT_STYLE = {
  primary: styles.buttonPrimary,
  secondary: styles.buttonSecondary,
  outline: styles.buttonOutline,
}

export default function AppButton({ variant = 'primary', children, style, disabled, type = 'button', ...rest }) {
  const base = VARIANT_STYLE[variant] ?? styles.buttonPrimary

  return (
    <Pressable
      type={type}
      disabled={disabled}
      style={{
        ...base,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      {...rest}
    >
      {children}
    </Pressable>
  )
}
