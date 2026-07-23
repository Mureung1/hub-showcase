import { useState } from 'react'
import {
  Check,
  Clock3,
  Copy,
  ExternalLink,
  FolderOpen,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

import {
  type PublicPreviewAction,
  type PublicPreviewScreenModel,
  type PublicPreviewSemesterDraft,
} from './public-preview-view-model.js'
import {
  type PublicPreviewController,
  usePublicPreview,
} from './use-public-preview.js'

type GuidedInputScreen = Extract<
  PublicPreviewScreenModel,
  { readonly surface: 'guided'; readonly stage: 'input' }
>
type GuidedConfirmationScreen = Extract<
  PublicPreviewScreenModel,
  { readonly surface: 'guided'; readonly stage: 'confirmation' }
>
type GuidedWorkingScreen = Extract<
  PublicPreviewScreenModel,
  { readonly surface: 'guided'; readonly stage: 'working' }
>
type ProtectedScreen = Extract<
  PublicPreviewScreenModel,
  { readonly surface: 'protected' }
>
type ReadyScreen = Extract<
  PublicPreviewScreenModel,
  { readonly surface: 'ready' }
>

export function PublicPreviewRoot() {
  const controller = usePublicPreview()
  const screen = controller.screen

  return (
    <div
      className="public-preview-shell"
      data-surface={screen?.surface ?? 'loading'}
    >
      <PublicPreviewHeader controller={controller} />
      <main className="public-preview-main">
        {controller.notice ? (
          <div
            className={`public-preview-notice is-${controller.notice.tone}`}
            role={controller.notice.tone === 'error' ? 'alert' : 'status'}
          >
            <span>{controller.notice.message}</span>
          </div>
        ) : null}
        {screen === null ? (
          <UnavailableSurface controller={controller} />
        ) : screen.surface === 'account' ? (
          <AccountSurface screen={screen} controller={controller} />
        ) : screen.surface === 'guided' && screen.stage === 'input' ? (
          <GuidedInputSurface
            key={`${screen.form.safeDisplayLocation ?? 'unselected'}:${screen.form.suggestedLeafName}`}
            screen={screen}
            controller={controller}
          />
        ) : screen.surface === 'guided' &&
          screen.stage === 'confirmation' ? (
          <GuidedConfirmationSurface
            screen={screen}
            controller={controller}
          />
        ) : screen.surface === 'guided' ? (
          <GuidedWorkingSurface screen={screen} />
        ) : screen.surface === 'protected' ? (
          <ProtectedSurface screen={screen} controller={controller} />
        ) : (
          <ReadySurface screen={screen} />
        )}
      </main>
    </div>
  )
}

function PublicPreviewHeader({
  controller,
}: {
  readonly controller: PublicPreviewController
}) {
  const screen = controller.screen
  const context =
    screen?.surface === 'ready'
      ? screen.workspace.semesterLabel
      : screen?.surface === 'guided'
        ? '새 학기 공간 준비'
        : screen?.surface === 'protected'
          ? '학기 공간 보호'
          : '첫 연결'

  return (
    <header className="public-preview-header">
      <div className="public-preview-brand">
        <span className="public-preview-brand-mark" aria-hidden="true">
          <Sparkles size={21} strokeWidth={2.2} />
        </span>
        <span>
          <strong>AY-PLE</strong>
          <small>한 학기를 함께 관리하는 AY</small>
        </span>
      </div>
      <div className="public-preview-context">
        <span>{context}</span>
        {screen?.surface === 'ready' ? (
          <strong>
            <Check size={15} strokeWidth={2.8} aria-hidden="true" />
            Codex 연결됨
          </strong>
        ) : controller.refreshing ? (
          <strong>
            <Clock3
              className="public-preview-spin"
              size={15}
              aria-hidden="true"
            />
            상태 확인 중
          </strong>
        ) : null}
      </div>
      <div className="public-preview-header-actions">
        {screen?.accountAction ? (
          <button
            className="public-preview-button is-quiet"
            type="button"
            disabled={controller.pendingActionId !== null}
            onClick={() => void controller.runAction(screen.accountAction!.id)}
          >
            <LogOut size={15} aria-hidden="true" />
            {screen.accountAction.label}
          </button>
        ) : (
          <span className="public-preview-header-placeholder" />
        )}
      </div>
    </header>
  )
}

function UnavailableSurface({
  controller,
}: {
  readonly controller: PublicPreviewController
}) {
  if (controller.initialLoading) {
    return (
      <section className="public-preview-centered" role="status">
        <span className="public-preview-orbit" aria-hidden="true">
          <Clock3 className="public-preview-spin" size={28} />
        </span>
        <p className="public-preview-eyebrow">AY-PLE 시작하기</p>
        <h1 tabIndex={-1}>학기 공간 상태를 확인하고 있어요</h1>
        <p>Codex 연결과 학기 공간을 안전하게 확인합니다.</p>
      </section>
    )
  }
  return (
    <section className="public-preview-centered">
      <span className="public-preview-orbit is-error" aria-hidden="true">
        <RefreshCw size={28} />
      </span>
      <p className="public-preview-eyebrow">연결 확인 필요</p>
      <h1 tabIndex={-1}>AY-PLE을 열지 못했어요</h1>
      <p>잠시 뒤 다시 확인해 주세요. 학기 공간은 변경하지 않습니다.</p>
      <button
        className="public-preview-button is-primary"
        type="button"
        disabled={controller.refreshing}
        onClick={() => void controller.refresh()}
      >
        <RefreshCw size={17} aria-hidden="true" />
        다시 확인
      </button>
    </section>
  )
}

function AccountSurface({
  screen,
  controller,
}: {
  readonly screen: Extract<
    PublicPreviewScreenModel,
    { readonly surface: 'account' }
  >
  readonly controller: PublicPreviewController
}) {
  return (
    <section className="public-preview-account-layout">
      <div className="public-preview-account-story" aria-hidden="true">
        <span className="public-preview-story-mark">
          <Sparkles size={36} strokeWidth={1.7} />
        </span>
        <p>수업 자료부터 일정까지, 한 학기의 맥락을 한곳에서 이어갑니다.</p>
        <div className="public-preview-story-lines">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="public-preview-card public-preview-account-card">
        <p className="public-preview-eyebrow">Codex account</p>
        <h1 tabIndex={-1}>{screen.title}</h1>
        <p className="public-preview-lead">{screen.message}</p>
        {screen.busy ? (
          <div className="public-preview-inline-status" role="status">
            <Clock3
              className="public-preview-spin"
              size={18}
              aria-hidden="true"
            />
            연결 상태를 안전하게 확인하고 있습니다.
          </div>
        ) : null}
        {screen.externalLoginUrl ? (
          <a
            className="public-preview-button is-primary"
            href={screen.externalLoginUrl}
            target="_blank"
            rel="noreferrer"
          >
            OpenAI 로그인 열기
            <ExternalLink size={17} aria-hidden="true" />
          </a>
        ) : null}
        <PublicPreviewActions
          actions={screen.actions}
          controller={controller}
        />
        <p className="public-preview-helper">
          로그인 정보는 AY-PLE 화면에 저장하지 않고 Codex가 관리합니다.
        </p>
      </div>
    </section>
  )
}

function GuidedInputSurface({
  screen,
  controller,
}: {
  readonly screen: GuidedInputScreen
  readonly controller: PublicPreviewController
}) {
  const [draft, setDraft] = useState<PublicPreviewSemesterDraft>({
    yearLevel: screen.form.yearLevelOptions[0]?.value ?? 1,
    term: screen.form.termOptions[0]?.value ?? '',
    leafName: screen.form.suggestedLeafName,
  })
  const prepareEnabled =
    screen.form.parentName !== null &&
    screen.form.yearLevelOptions.some(
      ({ value }) => value === draft.yearLevel,
    ) &&
    screen.form.termOptions.some(({ value }) => value === draft.term) &&
    draft.leafName.trim().length > 0

  return (
    <GuidedFrame currentStep={2}>
      <form
        className="public-preview-card public-preview-guided-card"
        onSubmit={(event) => {
          event.preventDefault()
          if (prepareEnabled) {
            void controller.runAction('prepare', draft)
          }
        }}
      >
        <p className="public-preview-eyebrow">학기 정보 · 2 / 3</p>
        <h1 tabIndex={-1}>{screen.title}</h1>
        <p className="public-preview-lead">{screen.message}</p>
        <div className="public-preview-form-grid">
          <label>
            <span>학년</span>
            <select
              value={draft.yearLevel}
              disabled={controller.pendingActionId !== null}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  yearLevel: Number(event.target.value),
                }))
              }
            >
              {screen.form.yearLevelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>학기</span>
            <select
              value={draft.term}
              disabled={controller.pendingActionId !== null}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  term: event.target.value,
                }))
              }
            >
              {screen.form.termOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="public-preview-location-card">
          <span className="public-preview-location-icon" aria-hidden="true">
            <FolderOpen size={20} />
          </span>
          <span>
            <small>학기 공간을 만들 상위 위치</small>
            <strong>
              {screen.form.parentName ?? '아직 위치를 선택하지 않았어요'}
            </strong>
            {screen.form.safeDisplayLocation ? (
              <span>{screen.form.safeDisplayLocation}</span>
            ) : (
              <span>위치를 선택해야 다음 단계로 갈 수 있어요.</span>
            )}
          </span>
          <button
            className="public-preview-button is-secondary"
            type="button"
            disabled={controller.pendingActionId !== null}
            onClick={() => void controller.runAction('parent_select')}
          >
            위치 선택
          </button>
        </div>
        <label className="public-preview-leaf-field">
          <span>새 학기 공간 이름</span>
          <input
            value={draft.leafName}
            maxLength={80}
            disabled={controller.pendingActionId !== null}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                leafName: event.target.value,
              }))
            }
          />
          <small>선택한 상위 위치 안에 새로운 공간으로 만듭니다.</small>
        </label>
        <SetupBoundaryCopy />
        <div className="public-preview-decision-row">
          <button
            className="public-preview-button is-primary"
            type="submit"
            disabled={
              !prepareEnabled || controller.pendingActionId !== null
            }
          >
            선택 내용 확인
          </button>
        </div>
      </form>
    </GuidedFrame>
  )
}

function GuidedConfirmationSurface({
  screen,
  controller,
}: {
  readonly screen: GuidedConfirmationScreen
  readonly controller: PublicPreviewController
}) {
  return (
    <GuidedFrame currentStep={3}>
      <section className="public-preview-card public-preview-guided-card">
        <p className="public-preview-eyebrow">최종 확인 · 3 / 3</p>
        <h1 tabIndex={-1}>{screen.title}</h1>
        <p className="public-preview-lead">{screen.message}</p>
        <dl className="public-preview-summary-list">
          <div>
            <dt>학기</dt>
            <dd>{screen.summary.semesterLabel}</dd>
          </div>
          <div>
            <dt>상위 위치</dt>
            <dd>
              <strong>{screen.summary.parentName}</strong>
              <span>{screen.summary.safeDisplayLocation}</span>
            </dd>
          </div>
          <div>
            <dt>새 학기 공간</dt>
            <dd>{screen.summary.workspaceName}</dd>
          </div>
        </dl>
        <SetupBoundaryCopy />
        <PublicPreviewActions
          actions={screen.actions}
          controller={controller}
        />
      </section>
    </GuidedFrame>
  )
}

function GuidedWorkingSurface({
  screen,
}: {
  readonly screen: GuidedWorkingScreen
}) {
  return (
    <GuidedFrame currentStep={3}>
      <section
        className="public-preview-card public-preview-guided-card"
        aria-live="polite"
      >
        <p className="public-preview-eyebrow">학기 공간 준비 중</p>
        <h1 tabIndex={-1}>{screen.title}</h1>
        <p className="public-preview-lead">{screen.message}</p>
        <ol className="public-preview-progress-list">
          {screen.progress.map((item) => (
            <li className={`is-${item.state}`} key={item.label}>
              <span aria-hidden="true">
                {item.state === 'complete' ? (
                  <Check size={15} strokeWidth={3} />
                ) : (
                  <span />
                )}
              </span>
              <strong>{item.label}</strong>
              <small>
                {item.state === 'complete'
                  ? '확인됨'
                  : item.state === 'active'
                    ? '진행 중'
                    : '곧 확인'}
              </small>
            </li>
          ))}
        </ol>
        <p className="public-preview-safe-note">
          이 탭을 닫아도 준비 작업은 임의로 취소되지 않습니다. 같은 실행
          명령으로 다시 열면 현재 상태부터 확인합니다.
        </p>
      </section>
    </GuidedFrame>
  )
}

function GuidedFrame({
  currentStep,
  children,
}: {
  readonly currentStep: 2 | 3
  readonly children: React.ReactNode
}) {
  const steps = ['Codex 연결', '학기 정보', '학기 공간 만들기']
  return (
    <div className="public-preview-guided-layout">
      <aside className="public-preview-step-rail" aria-label="설정 단계">
        <p className="public-preview-eyebrow">Semester setup</p>
        <h2>새 학기 시작하기</h2>
        <ol>
          {steps.map((label, index) => {
            const number = index + 1
            const state =
              number < currentStep
                ? 'complete'
                : number === currentStep
                  ? 'active'
                  : 'upcoming'
            return (
              <li className={`is-${state}`} key={label}>
                <span aria-hidden="true">
                  {state === 'complete' ? (
                    <Check size={14} strokeWidth={3} />
                  ) : (
                    number
                  )}
                </span>
                <strong>{label}</strong>
              </li>
            )
          })}
        </ol>
        <p>
          마지막 승인 전에는 새 학기 공간이나 설정 파일을 만들지 않아요.
        </p>
      </aside>
      {children}
    </div>
  )
}

function ProtectedSurface({
  screen,
  controller,
}: {
  readonly screen: ProtectedScreen
  readonly controller: PublicPreviewController
}) {
  return (
    <section className="public-preview-protected-layout">
      <div className="public-preview-card public-preview-protected-card">
        <span className="public-preview-orbit is-protected" aria-hidden="true">
          {screen.busy ? (
            <Clock3 className="public-preview-spin" size={28} />
          ) : (
            <ShieldCheck size={28} />
          )}
        </span>
        <p className="public-preview-eyebrow">학기 공간 보호</p>
        <h1 tabIndex={-1}>{screen.title}</h1>
        <p className="public-preview-lead">{screen.message}</p>
        {screen.externalLoginUrl ? (
          <a
            className="public-preview-button is-primary"
            href={screen.externalLoginUrl}
            target="_blank"
            rel="noreferrer"
          >
            OpenAI 로그인 열기
            <ExternalLink size={17} aria-hidden="true" />
          </a>
        ) : null}
        {screen.requiredApplicationCommand ? (
          <ReleaseCommand
            command={screen.requiredApplicationCommand}
          />
        ) : null}
        <PublicPreviewActions
          actions={screen.actions}
          controller={controller}
        />
        <p className="public-preview-safe-note">
          AY-PLE은 확인되지 않은 학기 공간이나 기존 파일을 자동으로
          덮어쓰거나 삭제하지 않습니다.
        </p>
      </div>
    </section>
  )
}

function ReleaseCommand({ command }: { readonly command: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="public-preview-command">
      <span>필요한 실행 명령</span>
      <code>{command}</code>
      <button
        className="public-preview-button is-secondary"
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(command).then(
            () => setCopied(true),
            () => setCopied(false),
          )
        }}
      >
        <Copy size={16} aria-hidden="true" />
        {copied ? '복사됨' : '명령 복사'}
      </button>
    </div>
  )
}

function ReadySurface({ screen }: { readonly screen: ReadyScreen }) {
  return (
    <section className="public-preview-ready-layout">
      <div className="public-preview-validation-strip" aria-label="준비 확인">
        {screen.checks.map((check) => (
          <span key={check}>
            <Check size={15} strokeWidth={3} aria-hidden="true" />
            {check}
          </span>
        ))}
      </div>
      <div className="public-preview-card public-preview-ready-card">
        <span className="public-preview-orbit is-ready" aria-hidden="true">
          <Sparkles size={30} strokeWidth={1.9} />
        </span>
        <p className="public-preview-eyebrow">Semester ready</p>
        <h1 tabIndex={-1}>{screen.title}</h1>
        <p className="public-preview-lead">{screen.message}</p>
        <dl className="public-preview-workspace-summary">
          <div>
            <dt>학기</dt>
            <dd>{screen.workspace.semesterLabel}</dd>
          </div>
          <div>
            <dt>학기 공간</dt>
            <dd>{screen.workspace.workspaceName}</dd>
          </div>
          <div>
            <dt>위치</dt>
            <dd>{screen.workspace.safeDisplayLocation}</dd>
          </div>
        </dl>
        <p className="public-preview-boundary">{screen.boundaryCopy}</p>
      </div>
      <div className="public-preview-next-card" aria-disabled="true">
        <span>
          <small>{screen.nextJourney.eyebrow}</small>
          <strong>{screen.nextJourney.label}</strong>
          <span>다음 공개 단계에서 열립니다.</span>
        </span>
        <button
          className="public-preview-button is-secondary"
          type="button"
          disabled={screen.nextJourney.disabled}
        >
          아직 준비 중
        </button>
      </div>
    </section>
  )
}

function SetupBoundaryCopy() {
  return (
    <p className="public-preview-boundary">
      지금은 빈 학기 공간과 AY의 기본 도움 기능만 준비합니다. 과목과
      자료는 아직 만들지 않아요.
    </p>
  )
}

function PublicPreviewActions({
  actions,
  controller,
}: {
  readonly actions: readonly PublicPreviewAction[]
  readonly controller: PublicPreviewController
}) {
  if (actions.length === 0) return null
  return (
    <div className="public-preview-decision-row">
      {actions.map((action) => (
        <button
          className={`public-preview-button is-${action.hierarchy}`}
          type="button"
          key={action.id}
          disabled={controller.pendingActionId !== null}
          onClick={() => void controller.runAction(action.id)}
        >
          {controller.pendingActionId === action.id ? (
            <Clock3
              className="public-preview-spin"
              size={17}
              aria-hidden="true"
            />
          ) : null}
          {action.label}
        </button>
      ))}
    </div>
  )
}
