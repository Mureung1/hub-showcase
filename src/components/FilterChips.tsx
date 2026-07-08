type FilterChipsProps = {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
}

export function FilterChips({
  label,
  options,
  value,
  onChange,
}: FilterChipsProps) {
  return (
    <div className="filter-chips" aria-label={label}>
      {options.map((option) => (
        <button
          className={option === value ? 'selected' : ''}
          key={option}
          onClick={() => onChange(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  )
}
