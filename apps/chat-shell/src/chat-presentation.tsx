import {
  Bot,
  CircleAlert,
  CircleCheck,
  Clock3,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import type { CodexChatStatus } from '@ay-ple/codex-chat-runtime/contract'

import type {
  ChatFailure,
  ChatMessage,
  ChatPhase,
  ChatState,
  ChatTurnNotice,
} from './chat-model.js'
import type { StatusView } from './use-chat-shell.js'

export function RuntimeStatusCard({
  status,
  onRetry,
}: {
  readonly status: StatusView
  readonly onRetry: () => void
}) {
  if (status.state === 'loading') {
    return (
      <section
        className="runtime-card"
        aria-label="대화 서비스 상태"
        data-runtime-status="loading"
      >
        <Clock3 size={18} className="spinning-icon" />
        <div>
          <strong>상태 확인 중</strong>
          <span>안전하게 대화할 수 있는지 확인하고 있어요.</span>
        </div>
      </section>
    )
  }
  if (status.state === 'error') {
    return (
      <section
        className="runtime-card is-error"
        aria-label="대화 서비스 상태"
        data-runtime-status="error"
      >
        <CircleAlert size={18} />
        <div>
          <strong>상태를 불러오지 못했어요</strong>
          <button type="button" onClick={onRetry}>
            다시 확인
          </button>
        </div>
      </section>
    )
  }
  const value = status.value
  const diagnostics = statusDiagnostics(value)
  return (
    <section
      className={`runtime-card status-${value.state}`}
      aria-label="대화 서비스 상태"
      data-runtime-status={value.state}
    >
      {value.state === 'ready' ? (
        <CircleCheck size={18} />
      ) : value.state === 'failed' || value.state === 'unavailable' ? (
        <CircleAlert size={18} />
      ) : (
        <Clock3 size={18} />
      )}
      <div>
        <strong>{runtimeStatusLabel(value)}</strong>
        <span>{runtimeStatusDetail(value)}</span>
        {diagnostics.length > 0 ? (
          <DiagnosticDisclosure entries={diagnostics} />
        ) : null}
      </div>
    </section>
  )
}

export function ThreadMetadata({ state }: { readonly state: ChatState }) {
  return (
    <div className="native-metadata" aria-label="대화 진단 정보">
      <div>
        <span>Thread ID</span>
        <code>{state.threadId}</code>
      </div>
      {state.activeTurnId ?? state.terminal?.turnId ? (
        <div>
          <span>Turn ID</span>
          <code>{state.activeTurnId ?? state.terminal?.turnId}</code>
        </div>
      ) : null}
    </div>
  )
}

export function EmptyConversation({
  hasThread,
  runtimeReady,
}: {
  readonly hasThread: boolean
  readonly runtimeReady: boolean
}) {
  return (
    <div className="empty-conversation">
      <div className="empty-icon" aria-hidden="true">
        <Bot size={28} />
      </div>
      <h2>{hasThread ? '무엇이든 물어보세요' : '대화를 시작해 볼까요?'}</h2>
      <p>
        {hasThread
          ? '답변을 실시간으로 보여드리고, 완료 상태까지 확인할게요.'
          : runtimeReady
            ? '왼쪽의 새 대화 버튼을 눌러 시작하세요.'
            : '대화 서비스가 준비되면 새 대화를 시작할 수 있습니다.'}
      </p>
    </div>
  )
}

export function MessageRow({ message }: { readonly message: ChatMessage }) {
  const agent = message.kind === 'agent'
  return (
    <article className={`message-row ${agent ? 'is-agent' : 'is-user'}`}>
      <div className="message-avatar" aria-hidden="true">
        {agent ? <Sparkles size={16} /> : '나'}
      </div>
      <div className="message-content">
        <div className="message-heading">
          <strong>{agent ? 'AY' : '나'}</strong>
          {message.turnId ? <code>Turn ID · {message.turnId}</code> : null}
        </div>
        <p>{message.text}</p>
        {agent ? (
          <div className="message-metadata">
            <code>Item ID · {message.itemId}</code>
            <MessageStatus status={message.status} />
          </div>
        ) : null}
      </div>
    </article>
  )
}

export function TurnNotice({ notice }: { readonly notice: ChatTurnNotice }) {
  return (
    <div className="turn-notice" role="status">
      <RefreshCw size={16} aria-hidden="true" />
      <div>
        <strong>
          {notice.willRetry
            ? '연결을 다시 시도하고 있어요'
            : '답변 중 문제가 발생했어요'}
        </strong>
        <span>
          {notice.willRetry
            ? '답변을 이어서 준비하고 있습니다.'
            : '문제가 계속되면 새 대화에서 다시 시도해 주세요.'}
        </span>
        <DiagnosticDisclosure
          entries={[
            { label: '오류 코드', value: notice.code },
            { label: '세부 메시지', value: notice.displayMessage },
          ]}
        />
      </div>
    </div>
  )
}

export function ConversationTerminal({ state }: { readonly state: ChatState }) {
  if (state.phase === 'submitting' || state.phase === 'running') {
    return (
      <div className="active-turn-status" role="status">
        <span className="thinking-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>
          {state.phase === 'submitting'
            ? '답변을 시작하고 있어요'
            : 'AY가 답변을 정리하고 있어요'}
        </span>
      </div>
    )
  }
  if (state.phase === 'completed') {
    return (
      <div className="terminal-card is-completed" role="status">
        <CircleCheck size={18} />
        <div>
          <strong>답변을 완료했어요</strong>
          <span>답변이 끝까지 도착한 것을 확인했습니다.</span>
        </div>
      </div>
    )
  }
  if (state.phase === 'interrupted') {
    return (
      <div className="terminal-card is-interrupted" role="status">
        <CircleAlert size={18} />
        <div>
          <strong>답변이 중단됐어요</strong>
          <span>작성 중이던 답변을 더 이상 이어가지 않습니다.</span>
        </div>
      </div>
    )
  }
  if (state.failure) {
    return (
      <SafeFailureCard
        title={
          state.phase === 'turn-failed'
            ? '이번 답변을 완료하지 못했어요'
            : state.phase === 'request-failed'
              ? '요청을 시작하지 못했어요'
              : '대화 연결을 계속할 수 없어요'
        }
        description={failureDescription(state.phase)}
        failure={state.failure}
      />
    )
  }
  return null
}

export function SafeFailureCard({
  title,
  description,
  failure,
}: {
  readonly title: string
  readonly description: string
  readonly failure: ChatFailure
}) {
  return (
    <div className="terminal-card is-failed" role="alert">
      <CircleAlert size={18} />
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
        <DiagnosticDisclosure
          entries={[
            { label: '오류 코드', value: failure.code },
            { label: '세부 메시지', value: failure.displayMessage },
          ]}
        />
      </div>
    </div>
  )
}

export function ConversationStatePill({ phase }: { readonly phase: ChatPhase }) {
  return (
    <div className={`state-pill phase-${phase}`} data-conversation-phase={phase}>
      <span />
      {phaseLabel(phase)}
    </div>
  )
}

export function phaseLabel(phase: ChatPhase): string {
  if (phase === 'empty') return '대화 없음'
  if (phase === 'ready') return '입력 대기'
  if (phase === 'submitting') return '시작 중'
  if (phase === 'running') return '답변 중'
  if (phase === 'completed') return '완료됨'
  if (phase === 'interrupted') return '중단됨'
  if (phase === 'turn-failed') return '답변 실패'
  if (phase === 'request-failed') return '요청 실패'
  return '연결 실패'
}

export function composerPlaceholder(state: ChatState): string {
  if (state.phase === 'ready') return 'AY에게 무엇이든 물어보세요…'
  if (state.phase === 'submitting' || state.phase === 'running') {
    return '답변이 끝날 때까지 기다려 주세요.'
  }
  if (state.threadId === undefined) return '먼저 새 대화를 시작해 주세요.'
  return '새 대화를 시작하면 다시 메시지를 보낼 수 있어요.'
}

export function messageKey(message: ChatMessage, index: number): string {
  return message.kind === 'agent'
    ? `agent:${message.itemId}`
    : `user:${message.turnId ?? index}`
}

function MessageStatus({
  status,
}: {
  readonly status: Extract<ChatMessage, { kind: 'agent' }>['status']
}) {
  if (status === 'streaming') {
    return (
      <span className="streaming-indicator">
        <i /> 답변 중
      </span>
    )
  }
  if (status === 'completed') {
    return (
      <span className="completed-indicator">
        <CircleCheck size={13} /> 확정됨
      </span>
    )
  }
  return (
    <span className="stopped-indicator">
      <CircleAlert size={13} /> 미완료
    </span>
  )
}

function DiagnosticDisclosure({
  entries,
}: {
  readonly entries: readonly {
    readonly label: string
    readonly value: string
  }[]
}) {
  return (
    <details className="diagnostic-disclosure">
      <summary>진단 정보</summary>
      <div>
        {entries.map((entry) => (
          <p key={`${entry.label}:${entry.value}`}>
            <span>{entry.label}</span>
            <code>{entry.value}</code>
          </p>
        ))}
      </div>
    </details>
  )
}

function runtimeStatusLabel(status: CodexChatStatus): string {
  if (status.state === 'unavailable') return '사용할 수 없음'
  if (status.state === 'configured') return '대화 준비됨'
  if (status.state === 'starting') return '대화 준비 중'
  if (status.state === 'ready') return '대화 가능'
  return '대화 서비스 오류'
}

function failureDescription(phase: ChatPhase): string {
  if (phase === 'turn-failed') {
    return '답변이 끝나기 전에 문제가 발생했습니다. 새 대화에서 다시 시도해 주세요.'
  }
  if (phase === 'request-failed') {
    return '요청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
  return '대화 연결이 종료되었습니다. 새 대화를 시작하기 전에 서버 상태를 확인해 주세요.'
}

function runtimeStatusDetail(status: CodexChatStatus): string {
  if (status.state === 'unavailable') {
    if (status.reason === 'not_configured') {
      return '대화를 시작하려면 서버 설정이 필요합니다.'
    }
    if (status.reason === 'runtime_missing') {
      return '대화 실행 프로그램을 찾지 못했습니다.'
    }
    return '서버 설정을 확인해 주세요.'
  }
  if (status.state === 'failed') {
    return '연결이 종료되었습니다. 서버 상태를 확인해 주세요.'
  }
  if (status.state === 'starting') return '대화 실행 환경을 준비하고 있어요.'
  if (status.state === 'ready') return '메시지를 주고받을 준비가 됐어요.'
  return '새 대화를 시작할 준비가 됐어요.'
}

function statusDiagnostics(
  status: CodexChatStatus,
): readonly { readonly label: string; readonly value: string }[] {
  const policy = [
    { label: '승인 정책', value: status.approvalMode },
    { label: '실행 범위', value: status.sandbox },
  ]
  if (status.state === 'unavailable') {
    return [{ label: '상태 코드', value: status.reason }, ...policy]
  }
  return [
    { label: 'Runtime 버전', value: status.runtimeVersion },
    ...(status.state === 'failed'
      ? [{ label: '오류 코드', value: status.failureCode }]
      : []),
    ...policy,
  ]
}
