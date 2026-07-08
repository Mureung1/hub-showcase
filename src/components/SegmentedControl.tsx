type SegmentedControlProps = {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
}

export function SegmentedControl({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps) {
  return (
    <div className="segmented-control" aria-label={label}>
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
