import { useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { ApiClientError } from '../../api/client'
import mascotComplete from '../../assets/mascot/mascot-default&complete.png'
import type {
  ArticleDetail,
  CreateMissionRecordRequest,
  MissionRecord,
  MissionType,
} from '../../api/types'
import { CONTENT_TYPE_LABEL, MISSION_TYPE_LABEL } from '../../shared/domain/labels'
import ScreenHeader from '../../shared/ui/ScreenHeader/ScreenHeader'
import './Mission.css'

const MISSION_PLACEHOLDER: Record<MissionType, string> = {
  question: '글을 읽고 떠오른 궁금증을 질문 형태로 적어보세요.',
  rebuttal: '동의하기 어려운 지점을 한 문장으로 반박해보세요.',
  connection: '이 내용과 이어지는 내 경험이나 사례를 적어보세요.',
  expression: '지금 떠오른 생각이나 느낌을 솔직하게 표현해보세요.',
}

type MissionProps = {
  article: ArticleDetail
  onBack: () => void
  onSubmit: (request: CreateMissionRecordRequest) => Promise<MissionRecord>
  onGoToMyGgaem: () => void
}

type SaveState = 'idle' | 'saving' | 'error-422' | 'error-generic' | 'success'

export default function Mission({ article, onBack, onSubmit, onGoToMyGgaem }: MissionProps) {
  const [selectedMissionType, setSelectedMissionType] = useState<MissionType>(
    article.recommendedMission.type,
  )
  const [answer, setAnswer] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const submittingRef = useRef(false)

  const selectedPrompt =
    article.missionOptions.find((option) => option.type === selectedMissionType)?.prompt ?? ''
  const isRecommended = selectedMissionType === article.recommendedMission.type

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
      <div className="mission-complete">
        <div className="mission-complete-content">
          <img
            className="mission-complete-mascot"
            src={mascotComplete}
            alt=""
            aria-hidden="true"
          />

          <h1 className="mission-complete-title">오늘의 깸 완료!</h1>

          <p className="mission-complete-description">
            내 생각 하나가 <strong>사고 log</strong>에 쌓였어요.
            <br />
            내일 또 한 편, 또 한 줄.
          </p>

          <button
            type="button"
            className="btn-primary mission-complete-action"
            onClick={onGoToMyGgaem}
          >
            나의 깸에서 보기
            <ArrowUpRight aria-hidden="true" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <ScreenHeader title="오늘의 사고 미션" onBack={onBack} />

      <main className="mission-main">
        <section className="mission-article-card" aria-label="오늘 읽은 글">
          <div
            className={`mission-article-accent mission-article-accent--${selectedMissionType}`}
            aria-hidden="true"
          />
          <div className="mission-article-content">
            <p className="mission-article-label">오늘 읽은 글</p>
            <p className="mission-article-meta">
              <span>{article.sourceName}</span>
              <span aria-hidden="true">·</span>
              <span>{CONTENT_TYPE_LABEL[article.contentType]}</span>
            </p>
            <h2 className="mission-article-title">{article.title}</h2>
          </div>
        </section>

        <p className="mission-hint">
          {isRecommended ? '오늘의 추천 미션' : '미션을 바꿨어요'}
        </p>

        <div className="mission-type-group" role="group" aria-label="미션 유형">
          {article.missionOptions.map((option) => {
            const isSelected = option.type === selectedMissionType
            return (
              <button
                key={option.type}
                type="button"
                className={`mission-type-chip mission-type-chip--${option.type}${
                  isSelected ? ' mission-type-chip--selected' : ''
                }`}
                aria-pressed={isSelected}
                onClick={() => setSelectedMissionType(option.type)}
              >
                <span className="mission-type-dot" aria-hidden="true" />
                {MISSION_TYPE_LABEL[option.type]}
              </button>
            )
          })}
        </div>

        <h1 className="mission-question">{selectedPrompt}</h1>

        <textarea
          className="mission-textarea"
          aria-label="답변"
          placeholder={MISSION_PLACEHOLDER[selectedMissionType]}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
        />
        {!canSubmit && (
          <p className="mission-textarea-helper">
            조금 더 생각해봐요 — 한 문장으로 남겨보세요.
          </p>
        )}

        {saveState === 'error-422' && (
          <p role="alert">조금 더 생각을 담아 작성해 주세요.</p>
        )}
        {saveState === 'error-generic' && (
          <p role="alert">저장하지 못했어요. 다시 시도해 주세요.</p>
        )}
      </main>

      <footer className="mission-footer">
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
