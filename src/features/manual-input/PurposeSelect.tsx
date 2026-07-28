import { purposes, type PurposeId } from '../../entities/message'

type PurposeSelectProps = {
  selectedPurposeId: PurposeId | null
  onSelect: (purposeId: PurposeId) => void
}

function PurposeSelect({ selectedPurposeId, onSelect }: PurposeSelectProps) {
  return (
    <fieldset className="purpose-fieldset">
      <legend>어떤 말을 전하고 싶나요? (필수)</legend>
      <div className="purpose-list">
        {purposes.map((purpose) => (
          <button
            aria-pressed={purpose.id === selectedPurposeId}
            className="purpose-chip"
            data-selected={purpose.id === selectedPurposeId}
            key={purpose.id}
            onClick={() => onSelect(purpose.id)}
            type="button"
          >
            {purpose.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export default PurposeSelect
