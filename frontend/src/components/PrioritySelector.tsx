import { useState } from 'react'
import './PrioritySelector.css'

const PRIORITY_OPTIONS = [
  '매운맛',
  '가성비',
  '분위기',
  '조용함',
  '웨이팅',
] as const

export type PriorityOption = (typeof PRIORITY_OPTIONS)[number]

type PrioritySelectorProps = {
  initialPriorities?: PriorityOption[]
  onClose: () => void
  onApply: (priorities: PriorityOption[]) => void
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 5 14 14M19 5 5 19" />
    </svg>
  )
}

function PrioritySelector({
  initialPriorities = [],
  onClose,
  onApply,
}: PrioritySelectorProps) {
  const [priorities, setPriorities] = useState<PriorityOption[]>(
    initialPriorities.slice(0, 3),
  )

  const handleOptionClick = (option: PriorityOption) => {
    if (priorities.length >= 3 || priorities.includes(option)) return
    setPriorities((current) => [...current, option])
  }

  const handleApply = () => {
    if (priorities.length !== 3) return
    onApply(priorities)
  }

  return (
    <section className="priority-selector" aria-labelledby="priority-selector-title">
      <button
        className="priority-selector__close"
        type="button"
        aria-label="우선순위 설정 닫기"
        onClick={onClose}
      >
        <CloseIcon />
      </button>

      <div className="priority-selector__content">
        <h2 id="priority-selector-title">우선순위를 설정하세요.</h2>

        <ol className="priority-selector__ranks" aria-label="선택한 우선순위">
          {[0, 1, 2].map((index) => (
            <li className="priority-selector__rank" key={index}>
              <span className="priority-selector__rank-number">{index + 1}</span>
              <div className="priority-selector__rank-value">
                {priorities[index] ?? (
                  <span className="priority-selector__empty">선택</span>
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="priority-selector__options" aria-label="우선순위 항목">
          {PRIORITY_OPTIONS.map((option) => {
            const selectedRank = priorities.indexOf(option)
            const isSelected = selectedRank !== -1

            return (
              <button
                className="priority-selector__option"
                type="button"
                key={option}
                disabled={isSelected || priorities.length >= 3}
                aria-pressed={isSelected}
                onClick={() => handleOptionClick(option)}
              >
                {option}
                {isSelected && (
                  <span className="priority-selector__selected-rank">
                    {selectedRank + 1}순위
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="priority-selector__actions">
        <button
          className="priority-selector__reset"
          type="button"
          disabled={priorities.length === 0}
          onClick={() => setPriorities([])}
        >
          되돌리기
        </button>
        <button
          className="priority-selector__apply"
          type="button"
          disabled={priorities.length !== 3}
          onClick={handleApply}
        >
          적용
        </button>
      </div>
    </section>
  )
}

export default PrioritySelector
