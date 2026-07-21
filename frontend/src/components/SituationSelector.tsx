import {
  RECOMMENDATION_SITUATIONS,
  RECOMMENDATION_SITUATION_INFO,
  type RecommendationSituation,
} from '../types/recommendation'
import './SituationSelector.css'

type SituationSelectorProps = {
  selectedSituation: RecommendationSituation | null
  onClose: () => void
  onSelect: (situation: RecommendationSituation) => void
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 5 14 14M19 5 5 19" />
    </svg>
  )
}

function SituationSelector({
  selectedSituation,
  onClose,
  onSelect,
}: SituationSelectorProps) {
  return (
    <section className="situation-selector" aria-labelledby="situation-selector-title">
      <button
        className="situation-selector__close"
        type="button"
        aria-label="상황추천 닫기"
        onClick={onClose}
      >
        <CloseIcon />
      </button>

      <div className="situation-selector__heading">
        <span>상황추천</span>
        <h2 id="situation-selector-title">오늘은 어떤 곳을 찾고 있나요?</h2>
        <p>하나의 상황을 고르면 잘 맞는 가게를 찾아드려요.</p>
      </div>

      <div className="situation-selector__cards">
        {RECOMMENDATION_SITUATIONS.map((situation) => {
          const info = RECOMMENDATION_SITUATION_INFO[situation]
          const isSelected = selectedSituation === situation
          return (
            <button
              className="situation-selector__card"
              type="button"
              key={situation}
              aria-pressed={isSelected}
              onClick={() => onSelect(situation)}
            >
              <span className="situation-selector__emoji" aria-hidden="true">
                {info.emoji}
              </span>
              <strong>{info.title}</strong>
              <small>{info.description}</small>
              {isSelected && <span className="situation-selector__selected">선택됨</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default SituationSelector
