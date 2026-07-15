import type { RefObject } from 'react'
import type { Mode } from '../../entities/message'
import { AssistantPrompt } from '../guided-chat'

type ModeSelectProps = {
  headingRef: RefObject<HTMLHeadingElement | null>
  onChoose: (mode: Mode) => void
}

function ModeSelect({ headingRef, onChoose }: ModeSelectProps) {
  return (
    <div className="demo-panel wizard-panel">
      <AssistantPrompt
        assistantName="답냥이"
        description="빈칸부터 쓰지 않아도 괜찮아요. 필요한 방식부터 골라보자냥."
        headingRef={headingRef}
        title="지금 필요한 건 어떤 말이냥?"
      />

      <div aria-label="빠른 답변" className="mode-card-list quick-reply-list">
        <button className="mode-card" onClick={() => onChoose('reply')} type="button">
          <strong>답장할래요</strong>
          <span>받은 말에 답하거나 자주 쓰는 답장을 골라요</span>
        </button>
        <button className="mode-card" onClick={() => onChoose('initiate')} type="button">
          <strong>먼저 연락할래요</strong>
          <span>먼저 꺼낼 말을 상황에 맞춰 골라요</span>
        </button>
      </div>
    </div>
  )
}

export default ModeSelect
