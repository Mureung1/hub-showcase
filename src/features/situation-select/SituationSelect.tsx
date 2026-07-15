import type { RefObject } from 'react'
import { catAssistantAssets, situationCardsFor, type Mode, type Scenario, type SituationId } from '../../entities/message'
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
        ← 관계 바꾸기
      </button>
      <AssistantPrompt
        assistantName={scenario.helper}
        avatarAsset={catAssistantAssets[scenario.id]}
        description="아래에 있으면 한 번만 눌러도 세 가지 말로 바로 골라줄게요."
        headingRef={headingRef}
        title="어떤 상황인지 알려주라냥"
      />

      {mode === 'reply' && (
        <p className="situation-reply-note">
          아래 빠른 답변은 받은 내용을 읽지 않아요. 내용에 딱 맞추려면 ‘직접 설명할게요’를 골라주세요.
        </p>
      )}

      <div aria-label="상황 빠른 답변" className="situation-list">
        {situationCardsFor(scenario.id).map((card) => (
          <button className="situation-card" key={card.id} onClick={() => onSelectCard(card.id)} type="button">
            {card.label}
          </button>
        ))}
        <button className="situation-card situation-card--other" onClick={onManual} type="button">
          직접 설명할게요
        </button>
      </div>
    </div>
  )
}

export default SituationSelect
