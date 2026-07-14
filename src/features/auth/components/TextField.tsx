interface TextFieldProps {
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  autoComplete?: string
}

export default function TextField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
}: TextFieldProps) {
  return (
    <div className="mb-3.5">
      <label className="mb-1.5 block text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-10 w-full rounded-[var(--radius-control)] border px-3 text-[13.5px] outline-none focus:shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_0_16px_rgba(34,211,238,0.2)]"
        style={{
          borderColor: error ? 'var(--color-danger)' : 'var(--color-border-card-strong)',
          background: 'var(--color-bg-page)',
          color: 'var(--color-text-primary)',
        }}
      />
      {error && (
        <p className="mt-1 text-[11px]" style={{ color: 'var(--color-danger-text)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
