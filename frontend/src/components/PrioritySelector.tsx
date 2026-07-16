import { useState } from 'react'
import {
  REVIEW_CATEGORIES,
  REVIEW_CATEGORY_LABELS,
  type ReviewCategory,
  type TastePriorities,
} from '../types/review'
import './PrioritySelector.css'

type PrioritySelectorProps = {
  initialPriorities?: readonly ReviewCategory[]
  onClose: () => void
  onApply: (priorities: TastePriorities) => void
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
  const [priorities, setPriorities] = useState<ReviewCategory[]>(
    initialPriorities.slice(0, 3),
  )

  const handleOptionClick = (option: ReviewCategory) => {
    if (priorities.length >= 3 || priorities.includes(option)) return
    setPriorities((current) => [...current, option])
  }

  const handleApply = () => {
    if (priorities.length === 1) {
      onApply([priorities[0]])
    } else if (priorities.length === 2) {
      onApply([priorities[0], priorities[1]])
    } else if (priorities.length === 3) {
      onApply([priorities[0], priorities[1], priorities[2]])
    }
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
                {priorities[index] ? REVIEW_CATEGORY_LABELS[priorities[index]] : (
                  <span className="priority-selector__empty">선택</span>
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="priority-selector__options" aria-label="우선순위 항목">
          {REVIEW_CATEGORIES.map((option) => {
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
                {REVIEW_CATEGORY_LABELS[option]}
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
          disabled={priorities.length === 0}
          onClick={handleApply}
        >
          적용
        </button>
      </div>
    </section>
  )
}

export default PrioritySelector
