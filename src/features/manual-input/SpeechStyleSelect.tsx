import { speechStylesFor, type ScenarioId, type SpeechStyleId } from '../../entities/message'

type SpeechStyleSelectProps = {
  scenarioId: ScenarioId
  selectedSpeechStyleId: SpeechStyleId | null
  onSelect: (speechStyleId: SpeechStyleId) => void
}

function SpeechStyleSelect({ scenarioId, selectedSpeechStyleId, onSelect }: SpeechStyleSelectProps) {
  return (
    <fieldset className="speech-style-fieldset">
      <legend>평소 어떤 말투를 쓰나요? (필수)</legend>
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
                <span>{style.example}</span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export default SpeechStyleSelect
