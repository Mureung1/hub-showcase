import { useState, type FormEvent } from 'react'
import {
  Check,
  Clock3,
  FileText,
  FolderOpen,
  MessageCircle,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  RefreshCw,
  Send,
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
  RuntimeStatusCard,
  SafeFailureCard,
  ThreadMetadata,
  TurnNotice,
} from './chat-presentation.js'
import type { ProductRawMaterial } from './product-api.js'
import { useChatShell } from './use-chat-shell.js'
import {
  useSourceWorkbench,
  type ProductPreviewView,
  type ProductWorkspaceView,
} from './use-source-workbench.js'
import './App.css'

export default function App() {
  const workbench = useSourceWorkbench()
  const [chatOpen, setChatOpen] = useState(true)
  const courseName = workbench.readyWorkspace?.course?.displayName

  return (
    <div className={`product-shell ${chatOpen ? 'chat-open' : 'chat-closed'}`}>
      <header className="product-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <Sparkles size={19} strokeWidth={2.2} />
          </div>
          <div>
            <strong>AY-PLE</strong>
            <span>{courseName ?? '학기 작업공간'}</span>
          </div>
        </div>
        <div className="header-context" aria-label="현재 작업공간">
          <span>자료 중심 워크벤치</span>
          <strong>{courseName ?? '과목을 준비해 주세요'}</strong>
        </div>
        <button
          className="chat-toggle"
          type="button"
          aria-expanded={chatOpen}
          onClick={() => setChatOpen((current) => !current)}
        >
          {chatOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          {chatOpen ? 'AY Chat 숨기기' : 'AY Chat 열기'}
        </button>
      </header>

      <div className="workbench-grid">
        <MaterialsPane workbench={workbench} />
        <PreviewPane
          selectedMaterials={workbench.selectedMaterials}
          activeMaterialId={workbench.activeMaterialId}
          previewView={workbench.previewView}
          onSelectTab={workbench.setActiveMaterialId}
        />
        <aside className="chat-dock" aria-label="AY Chat" hidden={!chatOpen}>
          <ChatDock />
        </aside>
      </div>
    </div>
  )
}

function MaterialsPane({
  workbench,
}: {
  readonly workbench: ReturnType<typeof useSourceWorkbench>
}) {
  const [courseName, setCourseName] = useState('문제해결글쓰기')
  const view = workbench.workspaceView

  return (
    <aside className="materials-pane" aria-label="학기 자료">
      <div className="pane-heading">
        <div>
          <p className="eyebrow">SemesterWorkspace</p>
          <h1>학기 자료</h1>
        </div>
        {workbench.readyWorkspace ? (
          <button
            className="icon-button"
            type="button"
            aria-label="자료 새로고침"
            disabled={workbench.mutationPending}
            onClick={() => void workbench.refreshMaterials()}
          >
            <RefreshCw size={17} />
          </button>
        ) : null}
      </div>

      <WorkspaceState
        view={view}
        pending={workbench.mutationPending}
        onRetry={() => void workbench.loadWorkspace()}
        onActivate={() => void workbench.activateWorkspace()}
      />

      {workbench.operationFailure ? (
        <div className="workspace-state-card is-error" role="alert">
          <strong>요청을 완료하지 못했습니다</strong>
          <span>{workbench.operationFailure}</span>
        </div>
      ) : null}

      {workbench.readyWorkspace ? (
        <>
          <section className="course-card" aria-label="현재 과목">
            {workbench.readyWorkspace.course ? (
              <>
                <span>현재 과목</span>
                <strong>{workbench.readyWorkspace.course.displayName}</strong>
              </>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  void workbench.createCourse(courseName)
                }}
              >
                <strong>과목이 아직 없습니다</strong>
                <label htmlFor="course-name">과목 이름</label>
                <div>
                  <input
                    id="course-name"
                    value={courseName}
                    disabled={workbench.mutationPending}
                    onChange={(event) => setCourseName(event.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={
                      workbench.mutationPending || courseName.trim().length === 0
                    }
                  >
                    만들기
                  </button>
                </div>
              </form>
            )}
          </section>

          <div className="selection-summary" role="status">
            <span>이번 작업의 선택 자료</span>
            <strong>{workbench.selectedMaterialIds.length} / 2 선택됨</strong>
          </div>

          {workbench.readyWorkspace.materials.length === 0 ? (
            <div className="pane-empty-state">
              <FileText size={22} />
              <strong>등록할 수 있는 TXT 자료가 없습니다</strong>
              <span>학기 폴더에 UTF-8 TXT를 추가한 뒤 새로고침해 주세요.</span>
            </div>
          ) : (
            <div className="material-list">
              {workbench.readyWorkspace.materials.map((material) => {
                const selected = workbench.selectedMaterialIds.includes(
                  material.id,
                )
                const selectionFull =
                  workbench.selectedMaterialIds.length >= 2 && !selected
                return (
                  <label
                    className={`material-row ${selected ? 'is-selected' : ''}`}
                    key={material.id}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={selectionFull}
                      aria-label={`${material.relativePath} 선택`}
                      onChange={() => workbench.toggleMaterial(material.id)}
                    />
                    <span className="material-check" aria-hidden="true">
                      {selected ? <Check size={13} strokeWidth={3} /> : null}
                    </span>
                    <FileText size={17} aria-hidden="true" />
                    <span className="material-copy">
                      <strong>{material.relativePath}</strong>
                      <span>TXT · {formatBytes(material.size)}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          )}

          <button
            className="change-workspace-button"
            type="button"
            disabled={workbench.mutationPending}
            onClick={() => void workbench.activateWorkspace()}
          >
            <FolderOpen size={16} /> 다른 학기 폴더 열기
          </button>
        </>
      ) : null}
    </aside>
  )
}

function WorkspaceState({
  view,
  pending,
  onRetry,
  onActivate,
}: {
  readonly view: ProductWorkspaceView
  readonly pending: boolean
  readonly onRetry: () => void
  readonly onActivate: () => void
}) {
  if (view.state === 'loading') {
    return (
      <div className="workspace-state-card" role="status">
        <Clock3 className="spinning-icon" size={18} />
        <span>학기 작업공간을 불러오는 중입니다.</span>
      </div>
    )
  }
  if (view.state === 'error') {
    return (
      <div className="workspace-state-card is-error" role="alert">
        <strong>학기 작업공간을 불러오지 못했습니다</strong>
        <span>{view.displayMessage}</span>
        <button type="button" onClick={onRetry}>다시 불러오기</button>
      </div>
    )
  }
  if (view.workspace === null) {
    return (
      <div className="workspace-state-card">
        <strong>학기 폴더를 선택해 주세요</strong>
        <span>Server가 선택한 폴더만 안전하게 엽니다.</span>
        <button type="button" disabled={pending} onClick={onActivate}>
          학기 폴더 선택
        </button>
      </div>
    )
  }
  if (view.workspace.state === 'incompatible') {
    return (
      <div className="workspace-state-card is-error" role="alert">
        <strong>이 작업공간은 읽기 전용입니다</strong>
        <span>{view.workspace.displayMessage}</span>
        <button type="button" disabled={pending} onClick={onActivate}>
          다른 학기 폴더 선택
        </button>
      </div>
    )
  }
  return null
}

function PreviewPane({
  selectedMaterials,
  activeMaterialId,
  previewView,
  onSelectTab,
}: {
  readonly selectedMaterials: readonly ProductRawMaterial[]
  readonly activeMaterialId: string | undefined
  readonly previewView: ProductPreviewView
  readonly onSelectTab: (materialId: string) => void
}) {
  return (
    <main className="preview-pane" aria-label="자료 미리보기">
      <header className="preview-header">
        <div>
          <p className="eyebrow">Source preview</p>
          <h2>원본 자료</h2>
        </div>
        <span>{selectedMaterials.length === 2 ? '선택 완료' : '자료 2개를 선택하세요'}</span>
      </header>

      {selectedMaterials.length > 0 ? (
        <div className="source-tabs" role="tablist" aria-label="선택 자료">
          {selectedMaterials.map((material) => (
            <button
              key={material.id}
              type="button"
              role="tab"
              aria-selected={material.id === activeMaterialId}
              onClick={() => onSelectTab(material.id)}
            >
              <FileText size={14} />
              {material.relativePath}
            </button>
          ))}
        </div>
      ) : null}

      <section className="paper-preview" aria-live="polite">
        {previewView.state === 'idle' ? (
          <div className="preview-empty-state">
            <FileText size={30} />
            <h3>왼쪽에서 자료 두 개를 선택하세요</h3>
            <p>선택한 TXT의 실제 원문을 이곳에서 탭으로 비교할 수 있습니다.</p>
          </div>
        ) : previewView.state === 'loading' ? (
          <div className="preview-empty-state" role="status">
            <Clock3 className="spinning-icon" size={24} />
            <h3>원문을 불러오는 중입니다</h3>
            <p>{previewView.material.relativePath}</p>
          </div>
        ) : previewView.state === 'error' ? (
          <div className="preview-empty-state is-error" role="alert">
            <FileText size={24} />
            <h3>원문을 열지 못했습니다</h3>
            <p>{previewView.displayMessage}</p>
          </div>
        ) : (
          <article className="source-document">
            <div className="source-document-meta">
              <span>TXT 원문</span>
              <span>{formatBytes(previewView.preview.size)}</span>
              <span>digest {previewView.preview.digest.slice(0, 8)}</span>
            </div>
            <pre aria-label={`${previewView.preview.relativePath} 원문`}>
              {previewView.preview.text}
            </pre>
            {previewView.preview.truncated ? (
              <p className="preview-truncated">안전한 미리보기 범위까지만 표시했습니다.</p>
            ) : null}
          </article>
        )}
      </section>
    </main>
  )
}

function ChatDock() {
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
    showInterrupt,
    loadStatus,
    startConversation,
    submitTurn,
    interruptTurn,
  } = useChatShell()

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    void submitTurn()
  }

  return (
    <div className="chat-shell">
      <header className="chat-header">
        <div>
          <p className="eyebrow">Companion</p>
          <h2>AY Chat</h2>
        </div>
        <ConversationStatePill phase={conversation.phase} />
      </header>

      <div className="chat-controls">
        <button
          className="new-conversation-button"
          type="button"
          disabled={!canStartThread}
          aria-busy={threadPending}
          onClick={() => void startConversation()}
        >
          {threadPending ? <Clock3 size={16} className="spinning-icon" /> : <Plus size={16} />}
          {threadPending ? '대화 준비 중' : '새 대화'}
        </button>
        {showInterrupt ? (
          <button
            className="interrupt-button"
            type="button"
            disabled={!canInterrupt}
            aria-busy={conversation.phase === 'stopping'}
            onClick={() => void interruptTurn()}
          >
            <Square size={12} fill="currentColor" />
            {conversation.interrupt?.state === 'requesting'
              ? '중단 요청 중'
              : conversation.interrupt?.state === 'acknowledged'
                ? '중단 확인 대기'
                : '답변 중단'}
          </button>
        ) : null}
      </div>

      <RuntimeStatusCard status={status} onRetry={() => void loadStatus()} />

      <section className="transcript-panel" aria-label="대화" aria-live="polite">
        {conversation.threadId ? <ThreadMetadata state={conversation} /> : null}
        {conversation.messages.length === 0 ? (
          <EmptyConversation
            hasThread={conversation.threadId !== undefined}
            runtimeReady={runtimeCanStart}
          />
        ) : (
          <div className="message-list">
            {conversation.messages.map((message, index) => (
              <MessageRow key={messageKey(message, index)} message={message} />
            ))}
          </div>
        )}
        {conversation.notices.map((notice, index) => (
          <TurnNotice key={`${notice.turnId}:${notice.code}:${index}`} notice={notice} />
        ))}
        <ConversationTerminal state={conversation} />
        {conversation.controlFailure ? <ControlFailureCard state={conversation} /> : null}
        {actionFailure ? (
          <SafeFailureCard
            title="대화를 시작하지 못했어요"
            description="새 대화를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요."
            failure={actionFailure}
          />
        ) : null}
      </section>

      <form className="composer" onSubmit={onSubmit}>
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
            <Send size={17} />
          </button>
        </div>
        <div className="composer-footnote">
          <MessageCircle size={12} /> transcript는 새로고침하면 사라집니다.
        </div>
      </form>
    </div>
  )
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`
}
