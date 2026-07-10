import styles from './Envelope.module.css'

// 봉투 3종 (extracted-source.md §5 "봉투 선택(send)")
const VARIANTS = {
  basic: { bg: 'var(--color-paper-white)', stroke: 'var(--color-primary-teal)', seal: 'var(--color-accent-terracotta)' },
  lined: { bg: 'var(--color-cream)', stroke: 'var(--color-cool-gray)', seal: 'var(--color-primary-teal)' },
  wax: { bg: 'var(--color-paper-white)', stroke: 'var(--color-accent-terracotta)', seal: 'var(--color-accent-terracotta)', dash: '5 3' },
}

export default function Envelope({
  variant = 'basic',
  selected = false,
  floating = false,
  pulsing = false,
  onClick,
  width = 190,
  height = 130,
  label,
}) {
  const v = VARIANTS[variant]
  const classes = [
    styles.envelope,
    selected && styles.selected,
    floating && styles.floating,
    pulsing && styles.pulsing,
    onClick && styles.clickable,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={classes}
      style={{ width, height }}
      onClick={onClick}
      aria-pressed={onClick ? selected : undefined}
      aria-label={label}
    >
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
        <rect
          x="4"
          y="4"
          width={width - 8}
          height={height - 8}
          rx="4"
          style={{
            fill: v.bg,
            stroke: selected ? 'var(--color-primary-teal)' : v.stroke,
            strokeWidth: 2,
            strokeDasharray: v.dash,
          }}
        />
        <path
          d={`M4 4 L${width / 2} ${height / 2} L${width - 4} 4`}
          style={{ fill: 'none', stroke: v.stroke, strokeWidth: 2 }}
        />
        {variant === 'lined' && (
          <path
            d={`M4 ${height - 4} L${width / 2} ${height / 2 + 10} L${width - 4} ${height - 4}`}
            style={{ fill: 'none', stroke: v.stroke, strokeWidth: 1.5 }}
          />
        )}
        <circle cx={width / 2} cy={height / 2} r="12" style={{ fill: v.seal }} />
      </svg>
    </button>
  )
}
