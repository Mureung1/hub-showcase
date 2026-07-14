import type { RefObject } from 'react'
import type { Mode } from '../../entities/message'

type ModeSelectProps = {
  headingRef: RefObject<HTMLHeadingElement | null>
  onChoose: (mode: Mode) => void
}

function ModeSelect({ headingRef, onChoose }: ModeSelectProps) {
  return (
    <div className="demo-panel wizard-panel">
      <div className="section-heading">
        <span aria-hidden="true">1</span>
        <div>
          <h2 ref={headingRef} tabIndex={-1}>
            어떤 상황인가요?
          </h2>
          <p>방식을 먼저 고르면 그에 맞는 화면으로 안내해요.</p>
        </div>
      </div>

      <div className="mode-card-list">
        <button className="mode-card" onClick={() => onChoose('reply')} type="button">
          <strong>답장할래요</strong>
          <span>받은 메시지가 있어요. 붙여넣으면 거기에 맞춰 써줘요.</span>
        </button>
        <button className="mode-card" onClick={() => onChoose('initiate')} type="button">
          <strong>먼저 연락할래요</strong>
          <span>아직 아무 말도 안 했어요. 상황만 알려주면 돼요.</span>
        </button>
      </div>
    </div>
  )
}

export default ModeSelect
