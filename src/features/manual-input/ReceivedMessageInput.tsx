type ReceivedMessageInputProps = {
  value: string
  onChange: (value: string) => void
}

function ReceivedMessageInput({ value, onChange }: ReceivedMessageInputProps) {
  return (
    <label className="field">
      <span>받은 메시지 붙여넣기</span>
      <textarea
        aria-label="받은 메시지 붙여넣기"
        maxLength={500}
        onChange={(event) => onChange(event.target.value)}
        placeholder="여기에 상대방이 보낸 메시지를 붙여넣어요"
        value={value}
      />
      <span className="field-count" aria-live="polite">
        {value.length}/500자
      </span>
    </label>
  )
}

export default ReceivedMessageInput
