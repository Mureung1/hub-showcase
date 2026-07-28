import type { ReactNode, RefObject } from 'react'
import {
  catAssistantAssets,
  dabnyangiAsset,
  type CatAssistantAsset,
  type Mode,
  type Scenario,
  type Step,
} from '../../entities/message'

const progressLabels = ['방식', '관계', '상황', '보낼 말'] as const

const progressByStep: Record<Step, number> = {
  mode: 1,
  scenario: 2,
  situation: 3,
  context: 3,
  'email-details': 3,
  manual: 3,
  result: 4,
}

type GuidedChatFrameProps = {
  children: ReactNode
  mode: Mode | null
  scenario: Scenario | null
  step: Step
}

const scenarioSteps: readonly Step[] = ['situation', 'context', 'email-details', 'manual', 'result']

function GuidedChatFrame({ children, mode, scenario, step }: GuidedChatFrameProps) {
  const activeScenario = scenarioSteps.includes(step) ? scenario : null
  const assistantName = activeScenario?.helper ?? '답냥이'
  const currentProgress = progressByStep[step]
  const assistantAsset = activeScenario ? catAssistantAssets[activeScenario.id] : dabnyangiAsset

  return (
    <section aria-label="답냥이 가이드 대화" className="chat-shell" data-scenario={activeScenario?.id ?? 'default'}>
      <header className="chat-header">
        <span aria-hidden="true" className="chat-header-avatar">
          {assistantAsset.assetPath ? (
            <img alt="" data-crop={assistantAsset.crop} src={assistantAsset.assetPath} />
          ) : (
            '냥'
          )}
        </span>
        <div className="chat-header-copy">
          <strong>{assistantName}</strong>
          <span>
            {step === 'manual'
              ? '직접 설명으로 맞춤 작성 중'
              : activeScenario
                ? `${activeScenario.name} 말을 함께 골라요`
                : '빠른 선택으로 같이 골라요'}
          </span>
        </div>
        <div className="chat-progress-copy">
          <span>
            발자국 {currentProgress}/{progressLabels.length}
          </span>
          <ol aria-label={`말 고르기 ${currentProgress}/${progressLabels.length}단계`} className="chat-progress">
            {progressLabels.map((label, index) => {
              const position = index + 1
              return (
                <li
                  aria-current={position === currentProgress ? 'step' : undefined}
                  data-current={position === currentProgress}
                  data-done={position < currentProgress}
                  key={label}
                >
                  <span className="sr-only">{label}</span>
                </li>
              )
            })}
          </ol>
        </div>
      </header>

      <div className="chat-thread">
        <ConversationTrail mode={mode} scenario={scenario} step={step} />
        <div className="chat-active-turn">{children}</div>
      </div>
    </section>
  )
}

type ConversationTrailProps = {
  mode: Mode | null
  scenario: Scenario | null
  step: Step
}

function ConversationTrail({ mode, scenario, step }: ConversationTrailProps) {
  const showsMode = step !== 'mode' && mode !== null
  const showsScenario = ['situation', 'context', 'email-details', 'manual', 'result'].includes(step) && scenario !== null

  if (!showsMode && !showsScenario) return null

  return (
    <div aria-label="지금까지 고른 내용" className="conversation-trail">
      {showsMode && (
        <div className="chat-message chat-message--user">
          <span className="chat-speaker">내 선택</span>
          <p>{mode === 'reply' ? '답장할래요' : '먼저 연락할래요'}</p>
        </div>
      )}
      {showsScenario && scenario && (
        <div className="chat-message chat-message--user">
          <span className="chat-speaker">내 선택</span>
          <p>{scenario.name}</p>
        </div>
      )}
    </div>
  )
}

type AssistantPromptProps = {
  assistantName: string
  avatarAsset?: CatAssistantAsset
  description: string
  headingRef: RefObject<HTMLHeadingElement | null>
  title: string
}

function AssistantPrompt({
  assistantName,
  avatarAsset = dabnyangiAsset,
  description,
  headingRef,
  title,
}: AssistantPromptProps) {
  return (
    <div className="chat-prompt">
      <span aria-hidden="true" className="chat-message-avatar">
        {avatarAsset.assetPath ? (
          <img alt="" data-crop={avatarAsset.crop} src={avatarAsset.assetPath} />
        ) : (
          '냥'
        )}
      </span>
      <div className="chat-message chat-message--assistant">
        <span className="chat-speaker">{assistantName}</span>
        <div className="chat-bubble">
          <h2 ref={headingRef} tabIndex={-1}>
            {title}
          </h2>
          <p>{description}</p>
        </div>
      </div>
    </div>
  )
}

export { AssistantPrompt, GuidedChatFrame }
