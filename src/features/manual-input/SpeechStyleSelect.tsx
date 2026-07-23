import { speechStylesFor, type ScenarioId, type SpeechStyleId } from '../../entities/message'

type SpeechStyleSelectProps = {
  scenarioId: ScenarioId
  selectedSpeechStyleId: SpeechStyleId | null
  onSelect: (speechStyleId: SpeechStyleId) => void
  variant?: 'manual' | 'result'
}

function SpeechStyleSelect({
  scenarioId,
  selectedSpeechStyleId,
  onSelect,
  variant = 'manual',
}: SpeechStyleSelectProps) {
  const isResultVariant = variant === 'result'

  return (
    <fieldset
      className={`speech-style-fieldset${isResultVariant ? ' speech-style-fieldset--result' : ''}`}
    >
      <legend>{isResultVariant ? '말투 바꾸기' : '평소 어떤 말투를 쓰나요? (필수)'}</legend>
      <div className="speech-style-list">
        {speechStylesFor(scenarioId).map((style) => {
          const isSelected = style.id === selectedSpeechStyleId

          return (
            <label className="speech-style-option" data-selected={isSelected} key={style.id}>
              <input
                checked={isSelected}
                name="speech-style"
                onChange={() => onSelect(style.id)}
                type="radio"
                value={style.id}
              />
              <span className="speech-style-copy">
                <strong>{style.label}</strong>
                {!isResultVariant && <span>{style.example}</span>}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export default SpeechStyleSelect
