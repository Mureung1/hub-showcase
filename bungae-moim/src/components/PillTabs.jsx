export default function PillTabs({ options, value, onChange, ariaLabel }) {
  return (
    <div className="pill-tabs" role="tablist" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          className={`pill-tab${value === opt.value ? ' is-active' : ''}`}
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
