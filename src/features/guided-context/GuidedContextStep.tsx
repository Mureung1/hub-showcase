import type { RefObject } from 'react'
import {
  catAssistantAssets,
  type GuidedContextOption,
  type GuidedContextQuestion,
  type Mode,
  type Scenario,
} from '../../entities/message'
import { AssistantPrompt } from '../guided-chat'

type GuidedContextStepProps = {
  headingRef: RefObject<HTMLHeadingElement | null>
  isGenerating: boolean
  mode: Mode
  onBack: () => void
  onManual: () => void
  onSelectOption: (option: GuidedContextOption) => void
  onShowDraft: () => void
  question: GuidedContextQuestion
  scenario: Scenario
  selectedOptionId: string | null
  situationLabel: string
}

function GuidedContextStep({
  headingRef,
  isGenerating,
  mode,
  onBack,
  onManual,
  onSelectOption,
  onShowDraft,
  question,
  scenario,
  selectedOptionId,
  situationLabel,
}: GuidedContextStepProps) {
  return (
    <div aria-busy={isGenerating} className="demo-panel wizard-panel">
      <button className="wizard-back" disabled={isGenerating} onClick={onBack} type="button">
        ← 상황 다시 고르기
      </button>
      <AssistantPrompt
        assistantName={scenario.helper}
        avatarAsset={catAssistantAssets[scenario.id]}
        description="한 번만 고르면 관계에 맞는 세 가지 톤으로 만들어줄게요."
        headingRef={headingRef}
        title={question.prompt}
      />

      <p className="guided-context-card-summary">
        <strong>고른 상황</strong>
        {scenario.name} · {situationLabel}
      </p>

      {mode === 'reply' && (
        <p className="guided-context-note">
          이 빠른 질문은 받은 메시지 원문을 읽지 않아요. 원문에 맞추려면 ‘내 상황을 직접 설명하기’를 골라주세요.
        </p>
      )}

      <div aria-label="상황 핵심 질문 빠른 답변" className="guided-context-options">
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

      <p aria-live="polite" className="guided-context-status" role="status">
        {isGenerating ? '고른 내용을 반영해 보낼 말 3가지를 만들고 있어요.' : '답을 고르면 바로 만들어져요.'}
      </p>

      <div className="guided-context-secondary-actions">
        <button className="wizard-back guided-context-draft" disabled={isGenerating} onClick={onShowDraft} type="button">
          질문 없이 바로 초안 보기
        </button>
        <button className="wizard-back" disabled={isGenerating} onClick={onManual} type="button">
          내 상황을 직접 설명하기
        </button>
      </div>
    </div>
  )
}

export default GuidedContextStep
