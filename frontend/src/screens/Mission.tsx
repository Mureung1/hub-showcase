import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import type { Mission as MissionData } from '../missions'
import './Mission.css'

type MissionProps = {
  mission: MissionData
  selectedQuote: string
  onBack: () => void
  onSubmit: (answer: string) => void
}

export default function Mission({
  mission,
  selectedQuote,
  onBack,
  onSubmit,
}: MissionProps) {
  const [answer, setAnswer] = useState('')

  // DB 제약이 char_length(user_answer) > 0 이다. 공백만 있는 답변도 막는다.
  const trimmedAnswer = answer.trim()
  const canSubmit = trimmedAnswer.length > 0

  const MissionIcon = mission.icon

  return (
    <div className="app-shell">
      <header className="screen-header">
        <div className="header-side">
          <button
            className="icon-btn"
            type="button"
            aria-label="뒤로가기"
            onClick={onBack}
          >
            <ChevronLeft />
          </button>
          <h1>오늘의 미션</h1>
        </div>
        <div className="header-side header-side--right" />
      </header>

      <main className="screen-main">
        <div className="card">
          <p className="mission-quote-label">내가 칠한 문장</p>
          <p className="mission-quote-text">&ldquo;{selectedQuote}&rdquo;</p>
        </div>

        <div className="mission-type">
          <span
            className="mission-type-badge"
            style={{ background: mission.color }}
          >
            <MissionIcon />
          </span>
          <span className="mission-type-label">{mission.label}</span>
        </div>

        <h2 className="mission-question">{mission.prompt}</h2>

        <textarea
          className="mission-textarea"
          placeholder="한 줄이면 충분해요. 완벽하지 않아도 괜찮아요."
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
        />
        <p className="mission-textarea-helper">
          {canSubmit
            ? `${trimmedAnswer.length}자 기록 중`
            : '조금 더 생각해봐요 — 한 문장으로 남겨보세요'}
        </p>
      </main>

      <footer className="screen-footer">
        <button
          type="button"
          className="btn-primary"
          disabled={!canSubmit}
          onClick={() => onSubmit(trimmedAnswer)}
        >
          기록 남기기
        </button>
      </footer>
    </div>
  )
}
