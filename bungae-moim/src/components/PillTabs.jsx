export default function PillTabs({ options, value, onChange, ariaLabel, disabled }) {
  return (
    <div
      className="pill-tabs"
      role="tablist"
      aria-label={ariaLabel}
      style={disabled ? { pointerEvents: 'none', opacity: 0.6 } : undefined}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          className={`pill-tab${value === opt.value ? ' is-active' : ''}`}
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          disabled={disabled}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
