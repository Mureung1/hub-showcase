import { styles } from '../styles/theme.js'

export default function AppButton({ variant = 'primary', children, style, disabled, type = 'button', ...rest }) {
  const base = variant === 'secondary' ? styles.buttonSecondary : styles.buttonPrimary

  return (
    <button
      type={type}
      className="tds-press"
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
    </button>
  )
}
