import {
  Bot,
  CircleAlert,
  CircleCheck,
  Clock3,
  MessageCircle,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import type {
  CodexChatStatus,
  CodexChatStreamFrame,
} from '@ay-ple/codex-chat-runtime/contract'

import {
  ChatApiError,
  fetchCodexChatStatus,
  startCodexChatThread,
  streamCodexChatTurn,
} from './chat-api.js'
import {
  createInitialChatState,
  reduceChatState,
  type ChatFailure,
  type ChatMessage,
  type ChatPhase,
  type ChatState,
} from './chat-model.js'
import './App.css'

type StatusView =
  | { readonly state: 'loading' }
  | { readonly state: 'loaded'; readonly value: CodexChatStatus }
  | { readonly state: 'error' }

const GENERIC_REQUEST_FAILURE = {
  code: 'request_failed',
  displayMessage: 'Codex Chat 요청을 완료하지 못했습니다.',
} as const

export default function App() {
  const [status, setStatus] = useState<StatusView>({ state: 'loading' })
  const [conversation, dispatch] = useReducer(
    reduceChatState,
    undefined,
    createInitialChatState,
  )
  const [draft, setDraft] = useState('')
  const [threadPending, setThreadPending] = useState(false)
  const [actionFailure, setActionFailure] = useState<ChatFailure>()
  const streamController = useRef<AbortController | undefined>(undefined)

  async function loadStatus(signal?: AbortSignal) {
    setStatus({ state: 'loading' })
    try {
      const value = await fetchCodexChatStatus(signal)
      setStatus({ state: 'loaded', value })
    } catch {
      if (!signal?.aborted) setStatus({ state: 'error' })
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    void loadStatus(controller.signal)
    return () => {
      controller.abort()
      streamController.current?.abort()
    }
  }, [])

  const runtimeCanStart =
    status.state === 'loaded' &&
    (status.value.state === 'configured' || status.value.state === 'ready')
  const turnActive =
    conversation.phase === 'submitting' || conversation.phase === 'running'
  const canStartThread = runtimeCanStart && !threadPending && !turnActive
  const canSubmit =
    conversation.phase === 'ready' &&
    conversation.threadId !== undefined &&
    draft.trim().length > 0

  async function startConversation() {
    if (!canStartThread) return
    setThreadPending(true)
    setActionFailure(undefined)
    if (status.state === 'loaded' && status.value.state === 'configured') {
      setStatus({
        state: 'loaded',
        value: { ...status.value, state: 'starting' },
      })
    }
    try {
      const thread = await startCodexChatThread()
      dispatch({ type: 'thread.started', threadId: thread.threadId })
      setDraft('')
      await loadStatus()
    } catch (error) {
      setActionFailure(safeFailure(error))
      await loadStatus()
    } finally {
      setThreadPending(false)
    }
  }

  async function submitTurn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || conversation.threadId === undefined) return
    const text = draft
    const threadId = conversation.threadId
    const controller = new AbortController()
    let accepted = false
    streamController.current = controller
    setActionFailure(undefined)
    setDraft('')
    dispatch({ type: 'turn.submitted', text })
    try {
      await streamCodexChatTurn(
        threadId,
        text,
        (frame: CodexChatStreamFrame) => {
          if (frame.type === 'turn.accepted') accepted = true
          dispatch({ type: 'stream.frame', frame })
        },
        controller.signal,
      )
    } catch (error) {
      if (controller.signal.aborted) return
      if (!accepted && error instanceof ChatApiError) {
        dispatch({
          type: 'turn.request-failed',
          failure: safeFailure(error),
        })
      } else {
        dispatch({ type: 'stream.failed' })
      }
    } finally {
      if (streamController.current === controller) {
        streamController.current = undefined
      }
    }
  }

  return (
    <div className="chat-shell">
      <aside className="shell-sidebar" aria-label="Chat Shell navigation">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <Sparkles size={20} strokeWidth={2.2} />
          </div>
          <div>
            <strong>AY-PLE</strong>
            <span>Codex Chat</span>
          </div>
        </div>

        <button
          className="new-conversation-button"
          type="button"
          disabled={!canStartThread}
          aria-busy={threadPending}
          onClick={() => void startConversation()}
        >
          {threadPending ? (
            <Clock3 size={18} className="spinning-icon" />
          ) : (
            <Plus size={18} />
          )}
          {threadPending ? '대화 준비 중' : '새 대화'}
        </button>

        <RuntimeStatusCard
          status={status}
          onRetry={() => void loadStatus()}
        />

        <div className="conversation-index">
          <div className="sidebar-section-label">현재 대화</div>
          {conversation.threadId ? (
            <div className="conversation-index-item is-active">
              <MessageCircle size={17} aria-hidden="true" />
              <div>
                <strong>새 Codex 대화</strong>
                <span>{phaseLabel(conversation.phase)}</span>
              </div>
            </div>
          ) : (
            <p className="sidebar-empty-copy">
              새 대화를 만들면 여기에 표시됩니다.
            </p>
          )}
        </div>

        <div className="policy-card">
          <ShieldCheck size={18} aria-hidden="true" />
          <div>
            <strong>보호된 첫 연결</strong>
            <span>승인 요청 안 함 · 읽기 전용</span>
          </div>
        </div>
      </aside>

      <main className="conversation-workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Codex-native conversation</p>
            <h1>AY와 대화하기</h1>
          </div>
          <ConversationStatePill phase={conversation.phase} />
        </header>

        <section
          className="transcript-panel"
          aria-label="대화"
          aria-live="polite"
        >
          {conversation.threadId ? (
            <ThreadMetadata state={conversation} />
          ) : null}

          {conversation.messages.length === 0 ? (
            <EmptyConversation
              hasThread={conversation.threadId !== undefined}
              runtimeReady={runtimeCanStart}
            />
          ) : (
            <div className="message-list">
              {conversation.messages.map((message, index) => (
                <MessageRow
                  key={messageKey(message, index)}
                  message={message}
                />
              ))}
            </div>
          )}

          {conversation.notices.map((notice, index) => (
            <div
              className="turn-notice"
              key={`${notice.turnId}:${notice.code}:${index}`}
              role="status"
            >
              <RefreshCw size={16} aria-hidden="true" />
              <div>
                <strong>
                  {notice.willRetry
                    ? '연결을 다시 시도하고 있어요'
                    : 'Codex가 오류를 보고했어요'}
                </strong>
                <span>{notice.code}</span>
              </div>
            </div>
          ))}

          <ConversationTerminal state={conversation} />

          {actionFailure ? (
            <SafeFailureCard
              title="대화를 시작하지 못했어요"
              failure={actionFailure}
            />
          ) : null}
        </section>

        <form className="composer" onSubmit={(event) => void submitTurn(event)}>
          <label htmlFor="chat-prompt">메시지</label>
          <div className="composer-row">
            <textarea
              id="chat-prompt"
              value={draft}
              disabled={conversation.phase !== 'ready'}
              placeholder={composerPlaceholder(conversation)}
              rows={2}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
            />
            <button
              className="send-button"
              type="submit"
              disabled={!canSubmit}
              aria-label="메시지 보내기"
            >
              <Send size={19} aria-hidden="true" />
            </button>
          </div>
          <div className="composer-footnote">
            <span>Enter로 보내기 · Shift+Enter로 줄바꿈</span>
            <span>대화는 이 브라우저 세션에만 유지됩니다.</span>
          </div>
        </form>
      </main>
    </div>
  )
}

function RuntimeStatusCard({
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
        aria-label="Codex 런타임 상태"
        data-runtime-status="loading"
      >
        <Clock3 size={18} className="spinning-icon" />
        <div>
          <strong>상태 확인 중</strong>
          <span>안전한 연결을 확인하고 있어요.</span>
        </div>
      </section>
    )
  }
  if (status.state === 'error') {
    return (
      <section
        className="runtime-card is-error"
        aria-label="Codex 런타임 상태"
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
  return (
    <section
      className={`runtime-card status-${value.state}`}
      aria-label="Codex 런타임 상태"
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
      </div>
    </section>
  )
}

function ThreadMetadata({ state }: { readonly state: ChatState }) {
  return (
    <div className="native-metadata" aria-label="Native conversation identity">
      <div>
        <span>Native thread</span>
        <code>{state.threadId}</code>
      </div>
      {state.activeTurnId ?? state.terminal?.turnId ? (
        <div>
          <span>Native turn</span>
          <code>{state.activeTurnId ?? state.terminal?.turnId}</code>
        </div>
      ) : null}
    </div>
  )
}

function EmptyConversation({
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
          ? 'Codex의 답변을 native identity와 함께 실시간으로 보여드릴게요.'
          : runtimeReady
            ? '왼쪽의 새 대화 버튼을 눌러 transient conversation을 만드세요.'
            : 'Codex runtime이 준비되면 새 대화를 시작할 수 있습니다.'}
      </p>
    </div>
  )
}

function MessageRow({ message }: { readonly message: ChatMessage }) {
  const agent = message.kind === 'agent'
  return (
    <article className={`message-row ${agent ? 'is-agent' : 'is-user'}`}>
      <div className="message-avatar" aria-hidden="true">
        {agent ? <Sparkles size={16} /> : '나'}
      </div>
      <div className="message-content">
        <div className="message-heading">
          <strong>{agent ? 'AY' : '나'}</strong>
          {message.turnId ? <code>turn · {message.turnId}</code> : null}
        </div>
        <p>{message.text}</p>
        {agent ? (
          <div className="message-metadata">
            <code>item · {message.itemId}</code>
            {message.status === 'streaming' ? (
              <span className="streaming-indicator">
                <i /> 답변 중
              </span>
            ) : (
              <span className="completed-indicator">
                <CircleCheck size={13} /> 확정됨
              </span>
            )}
          </div>
        ) : null}
      </div>
    </article>
  )
}

function ConversationTerminal({ state }: { readonly state: ChatState }) {
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
            ? 'Native turn을 시작하고 있어요'
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
          <span>Authoritative turn terminal을 확인했습니다.</span>
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
          <span>Codex가 interrupted terminal을 보냈습니다.</span>
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
              : 'Codex 연결을 계속할 수 없어요'
        }
        failure={state.failure}
      />
    )
  }
  return null
}

function SafeFailureCard({
  title,
  failure,
}: {
  readonly title: string
  readonly failure: ChatFailure
}) {
  return (
    <div className="terminal-card is-failed" role="alert">
      <CircleAlert size={18} />
      <div>
        <strong>{title}</strong>
        <span>{failure.displayMessage}</span>
        <code>{failure.code}</code>
      </div>
    </div>
  )
}

function ConversationStatePill({ phase }: { readonly phase: ChatPhase }) {
  return (
    <div className={`state-pill phase-${phase}`} data-conversation-phase={phase}>
      <span />
      {phaseLabel(phase)}
    </div>
  )
}

function runtimeStatusLabel(status: CodexChatStatus): string {
  if (status.state === 'unavailable') return '사용할 수 없음'
  if (status.state === 'configured') return '대화 준비됨'
  if (status.state === 'starting') return '런타임 시작 중'
  if (status.state === 'ready') return 'Codex 연결됨'
  return '런타임 오류'
}

function runtimeStatusDetail(status: CodexChatStatus): string {
  if (status.state === 'unavailable') {
    if (status.reason === 'not_configured') return 'Runtime 설정이 필요합니다.'
    if (status.reason === 'runtime_missing') return '검증된 runtime을 찾지 못했습니다.'
    return 'Runtime 설정을 확인해 주세요.'
  }
  if (status.state === 'failed') return `오류 코드 · ${status.failureCode}`
  if (status.state === 'starting') return 'Official SDK를 초기화하고 있어요.'
  return `v${status.runtimeVersion} · deny_all · read_only`
}

function phaseLabel(phase: ChatPhase): string {
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

function composerPlaceholder(state: ChatState): string {
  if (state.phase === 'ready') return 'AY에게 무엇이든 물어보세요…'
  if (state.phase === 'submitting' || state.phase === 'running') {
    return '답변이 끝날 때까지 기다려 주세요.'
  }
  if (state.threadId === undefined) return '먼저 새 대화를 시작해 주세요.'
  return '새 대화를 시작하면 다시 메시지를 보낼 수 있어요.'
}

function messageKey(message: ChatMessage, index: number): string {
  return message.kind === 'agent'
    ? `agent:${message.itemId}`
    : `user:${message.turnId ?? index}`
}

function safeFailure(error: unknown): ChatFailure {
  return error instanceof ChatApiError
    ? { code: error.code, displayMessage: error.displayMessage }
    : GENERIC_REQUEST_FAILURE
}
