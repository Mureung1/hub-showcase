import type { RefObject } from 'react'
import { situationCardsFor, type Mode, type Scenario, type SituationId } from '../../entities/message'

type SituationSelectProps = {
  headingRef: RefObject<HTMLHeadingElement | null>
  scenario: Scenario
  mode: Mode | null
  onBack: () => void
  onSelectCard: (situationId: SituationId) => void
  onManual: () => void
}

function SituationSelect({ headingRef, scenario, mode, onBack, onSelectCard, onManual }: SituationSelectProps) {
  return (
    <div className="demo-panel wizard-panel">
      <button className="wizard-back" onClick={onBack} type="button">
        ← 다른 관계 고르기
      </button>
      <div className="section-heading">
        <span aria-hidden="true">3</span>
        <div>
          <h2 ref={headingRef} tabIndex={-1}>
            어떤 상황이에요?
          </h2>
          <p>{scenario.helper}이 골라둔 상황 중 하나를 골라주세요. 바로 결과를 볼 수 있어요.</p>
        </div>
      </div>

      {mode === 'reply' && (
        <p className="situation-reply-note">
          카드는 받은 내용을 읽지 않는 자주 쓰는 답장이에요. 내용에 딱 맞추려면 ‘다른 상황이냥?’을 골라주세요.
        </p>
      )}

      <div className="situation-list">
        {situationCardsFor(scenario.id).map((card) => (
          <button className="situation-card" key={card.id} onClick={() => onSelectCard(card.id)} type="button">
            {card.label}
          </button>
        ))}
        <button className="situation-card situation-card--other" onClick={onManual} type="button">
          다른 상황이냥?
        </button>
      </div>
    </div>
  )
}

export default SituationSelect
