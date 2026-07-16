import {
  Clock3,
  MessageCircle,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
} from 'lucide-react'

import {
  composerPlaceholder,
  ControlFailureCard,
  ConversationStatePill,
  ConversationTerminal,
  EmptyConversation,
  messageKey,
  MessageRow,
  phaseLabel,
  RuntimeStatusCard,
  SafeFailureCard,
  ThreadMetadata,
  TurnNotice,
} from './chat-presentation.js'
import { useChatShell } from './use-chat-shell.js'
import './App.css'

export default function App() {
  const {
    status,
    conversation,
    draft,
    setDraft,
    threadPending,
    actionFailure,
    runtimeCanStart,
    canStartThread,
    canCompose,
    canSubmit,
    canInterrupt,
    loadStatus,
    startConversation,
    submitTurn,
    interruptTurn,
  } = useChatShell()

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

        <RuntimeStatusCard status={status} onRetry={() => void loadStatus()} />

        <div className="conversation-index">
          <div className="sidebar-section-label">현재 대화</div>
          {conversation.threadId ? (
            <div className="conversation-index-item is-active">
              <MessageCircle size={17} aria-hidden="true" />
              <div>
                <strong>새 대화</strong>
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
            <p className="eyebrow">함께 생각하는 대화</p>
            <h1>AY와 대화하기</h1>
          </div>
          <div className="workspace-actions">
            {conversation.activeTurnId &&
            (conversation.phase === 'running' ||
              conversation.phase === 'stopping') ? (
              <button
                className="interrupt-button"
                type="button"
                disabled={!canInterrupt}
                aria-busy={conversation.phase === 'stopping'}
                onClick={() => void interruptTurn()}
              >
                <Square size={14} fill="currentColor" aria-hidden="true" />
                {conversation.interrupt?.state === 'requesting'
                  ? '중단 요청 중'
                  : conversation.interrupt?.state === 'acknowledged'
                    ? '중단 확인 대기'
                    : '답변 중단'}
              </button>
            ) : null}
            <ConversationStatePill phase={conversation.phase} />
          </div>
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
            <TurnNotice
              key={`${notice.turnId}:${notice.code}:${index}`}
              notice={notice}
            />
          ))}

          <ConversationTerminal state={conversation} />

          {conversation.controlFailure ? (
            <ControlFailureCard state={conversation} />
          ) : null}

          {actionFailure ? (
            <SafeFailureCard
              title="대화를 시작하지 못했어요"
              description="새 대화를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요."
              failure={actionFailure}
            />
          ) : null}
        </section>

        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault()
            void submitTurn()
          }}
        >
          <label htmlFor="chat-prompt">메시지</label>
          <div className="composer-row">
            <textarea
              id="chat-prompt"
              value={draft}
              disabled={!canCompose}
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
