import type { RefObject } from 'react'
import { situationCardsFor, type Mode, type Scenario, type SituationId } from '../../entities/message'
import { AssistantPrompt } from '../guided-chat'

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
      <AssistantPrompt
        assistantName={scenario.helper}
        description="아래에 있으면 한 번만 눌러도 세 가지 말로 바로 골라줄게요."
        headingRef={headingRef}
        title="어떤 상황인지 알려주라냥"
      />

      {mode === 'reply' && (
        <p className="situation-reply-note">
          카드는 받은 내용을 읽지 않는 자주 쓰는 답장이에요. 내용에 딱 맞추려면 ‘다른 상황이냥?’을 골라주세요.
        </p>
      )}

      <div aria-label="상황 빠른 답변" className="situation-list">
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
