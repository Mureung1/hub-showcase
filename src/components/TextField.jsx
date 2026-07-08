import { styles } from '../styles/theme.js'

export default function TextField({ label, id, error, style, ...rest }) {
  return (
    <div style={styles.field}>
      {label && (
        <label htmlFor={id} style={styles.label}>
          {label}
        </label>
      )}
      <input id={id} style={{ ...styles.input, ...style }} {...rest} />
      {error && <p style={styles.errorText}>{error}</p>}
    </div>
  )
}
