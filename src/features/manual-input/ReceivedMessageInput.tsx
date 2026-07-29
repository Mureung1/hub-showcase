type ReceivedMessageInputProps = {
  value: string
  placeholder: string
  onChange: (value: string) => void
}

function ReceivedMessageInput({ value, placeholder, onChange }: ReceivedMessageInputProps) {
  return (
    <label className="field">
      <span>받은 내용 (선택)</span>
      <textarea
        aria-label="받은 내용 (선택)"
        maxLength={500}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      <span className="field-count" aria-live="polite">
        {value.length}/500자
      </span>
    </label>
  )
}

export default ReceivedMessageInput
