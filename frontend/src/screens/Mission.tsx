import { useRef, useState } from 'react'
import { ApiClientError } from '../api/client'
import type { ArticleDetail, CreateMissionRecordRequest, MissionRecord, MissionType } from '../api/types'
import './Mission.css'

const MISSION_TYPE_LABEL: Record<MissionType, string> = {
  question: '질문',
  rebuttal: '반박',
  connection: '연결',
  expression: '표현',
}

type MissionProps = {
  article: ArticleDetail
  onBack: () => void
  onSubmit: (request: CreateMissionRecordRequest) => Promise<MissionRecord>
  onGoToToday: () => void
}

type SaveState = 'idle' | 'saving' | 'error-422' | 'error-generic' | 'success'

export default function Mission({ article, onBack, onSubmit, onGoToToday }: MissionProps) {
  const [selectedMissionType, setSelectedMissionType] = useState<MissionType>(
    article.recommendedMission.type,
  )
  const [answer, setAnswer] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const submittingRef = useRef(false)

  const selectedPrompt =
    article.missionOptions.find((option) => option.type === selectedMissionType)?.prompt ?? ''

  // DB 제약이 char_length(user_answer) > 0 이다. 공백만 있는 답변도 막는다.
  const trimmedAnswer = answer.trim()
  const canSubmit = trimmedAnswer.length > 0
  const isSaving = saveState === 'saving'

  async function handleSubmit() {
    if (submittingRef.current || !canSubmit) return
    submittingRef.current = true
    setSaveState('saving')
    try {
      await onSubmit({
        articleId: article.id,
        missionType: selectedMissionType,
        userAnswer: trimmedAnswer,
      })
      setSaveState('success')
    } catch (error) {
      submittingRef.current = false
      setSaveState(error instanceof ApiClientError && error.status === 422 ? 'error-422' : 'error-generic')
    }
  }

  if (saveState === 'success') {
    return (
      <div className="app-shell">
        <main className="screen-main">
          <p className="mission-complete-title">생각을 기록했어요.</p>
          <p className="mission-complete-desc">나의 깸에서 다시 확인할 수 있어요.</p>
          <button type="button" className="btn-primary" onClick={onGoToToday}>
            오늘의 깸으로
          </button>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="screen-header">
        <button type="button" className="mission-back" onClick={onBack}>
          뒤로가기
        </button>
      </header>

      <main className="screen-main">
        <h1>오늘의 미션</h1>

        <label htmlFor="mission-type-select" className="mission-select-label">
          미션 유형
        </label>
        <select
          id="mission-type-select"
          className="mission-select"
          value={selectedMissionType}
          onChange={(event) => setSelectedMissionType(event.target.value as MissionType)}
        >
          {article.missionOptions.map((option) => (
            <option key={option.type} value={option.type}>
              {MISSION_TYPE_LABEL[option.type]}
            </option>
          ))}
        </select>

        <h2 className="mission-question">{selectedPrompt}</h2>

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

        {saveState === 'error-422' && (
          <p role="alert">조금 더 생각을 담아 작성해 주세요.</p>
        )}
        {saveState === 'error-generic' && (
          <p role="alert">저장하지 못했어요. 다시 시도해 주세요.</p>
        )}
      </main>

      <footer className="screen-footer">
        <button
          type="button"
          className="btn-primary"
          disabled={!canSubmit || isSaving}
          onClick={handleSubmit}
        >
          {isSaving ? '저장하고 있어요...' : '기록 남기기'}
        </button>
      </footer>
    </div>
  )
}
