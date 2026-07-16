import type { NoticeConfigForm } from '../types/noticeConfigTypes'

interface SelectorInputProps {
  id: keyof NoticeConfigForm
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}

export function SelectorInput({ id, label, value, placeholder, onChange }: SelectorInputProps) {
  return (
    <div className="selector-row">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
