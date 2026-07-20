import { useEffect, useRef } from 'react'
import type {
  GuidedContextOption,
  GuidedContextQuestion,
  Mode,
  Scenario,
} from '../../entities/message'

type ResultRefinementPanelProps = {
  isGenerating: boolean
  mode: Mode
  onClose: () => void
  onManual: () => void
  onSelectOption: (option: GuidedContextOption) => void
  question: GuidedContextQuestion
  scenario: Scenario
  selectedOptionId: string | null
  situationLabel: string
}

function ResultRefinementPanel({
  isGenerating,
  mode,
  onClose,
  onManual,
  onSelectOption,
  question,
  scenario,
  selectedOptionId,
  situationLabel,
}: ResultRefinementPanelProps) {
  const headingRef = useRef<HTMLHeadingElement | null>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <section aria-busy={isGenerating} className="result-refinement-panel">
      <div className="result-refinement-heading">
        <div>
          <span>AI로 더 맞추기</span>
          <h3 ref={headingRef} tabIndex={-1}>
            {question.prompt}
          </h3>
        </div>
        <button disabled={isGenerating} onClick={onClose} type="button">
          닫기
        </button>
      </div>
      <p className="result-refinement-summary">
        <strong>고른 상황</strong>
        {scenario.name} · {situationLabel}
      </p>
      {mode === 'reply' && (
        <p className="guided-context-note result-refinement-note">
          빠른 답변은 받은 메시지 원문을 읽지 않아요. 내용까지 반영하려면 직접 설명해 주세요.
        </p>
      )}
      <div aria-label="결과에서 답 바꾸기" className="guided-context-options result-refinement-options">
        {question.options.map((option) => (
          <button
            aria-label={`${option.label} 선택하고 초안 만들기`}
            aria-pressed={selectedOptionId === option.id}
            className="guided-context-option"
            disabled={isGenerating}
            key={option.id}
            onClick={() => onSelectOption(option)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      <p aria-live="polite" className="guided-context-status result-refinement-status" role="status">
        {isGenerating
          ? '기존 후보를 유지한 채 고른 내용으로 다시 만들고 있어요.'
          : '답을 고르면 현재 초안은 남겨두고 새 표현을 만들어요.'}
      </p>
      <button
        className="wizard-back result-refinement-manual"
        disabled={isGenerating}
        onClick={onManual}
        type="button"
      >
        사실을 더 알려주고 직접 설명하기
      </button>
    </section>
  )
}

export default ResultRefinementPanel
