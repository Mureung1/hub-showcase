type SituationInputProps = {
  value: string
  optional: boolean
  placeholder?: string
  onChange: (value: string) => void
}

function SituationInput({ value, optional, placeholder, onChange }: SituationInputProps) {
  const label = optional ? '상황 설명 (선택)' : '상황 설명'

  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        aria-label={label}
        maxLength={300}
        onChange={(event) => onChange(event.target.value)}
        placeholder={optional ? '더 알려주고 싶은 상황이 있다면 적어주세요' : placeholder}
        value={value}
      />
      <span className="field-count" aria-live="polite">
        {value.length}/300자
      </span>
    </label>
  )
}

export default SituationInput
