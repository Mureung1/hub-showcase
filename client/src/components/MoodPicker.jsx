const MOOD_OPTIONS = [
  { emoji: '😌', label: '평온함' },
  { emoji: '🙂', label: '괜찮음' },
  { emoji: '😐', label: '그저 그럼' },
  { emoji: '😞', label: '지침' },
  { emoji: '😢', label: '힘듦' },
]

function MoodPicker({ value, onChange }) {
  return (
    <div className="mood-picker" role="group" aria-label="오늘 기분">
      {MOOD_OPTIONS.map(({ emoji, label }) => (
        <button
          key={emoji}
          type="button"
          className={`mood-option${value === emoji ? ' selected' : ''}`}
          aria-label={label}
          aria-pressed={value === emoji}
          title={label}
          onClick={() => onChange(value === emoji ? '' : emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}

export default MoodPicker
