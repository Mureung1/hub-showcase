import { useEffect, useRef, useState } from 'react'
import {
  Check,
  Clock3,
  FileText,
  FolderOpen,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Sparkles,
} from 'lucide-react'

import { ProductChatDock } from './product-chat-presentation.js'
import type { ProductRawMaterial } from './product-api.js'
import { useProductChat } from './use-product-chat.js'
import {
  useSourceWorkbench,
  type ProductEvidenceFocus,
  type ProductPreviewView,
  type ProductWorkspaceView,
} from './use-source-workbench.js'
import './App.css'

export default function AcademicWorkbench() {
  const workbench = useSourceWorkbench()
  const productChat = useProductChat({
    accountReadiness: workbench.accountReadiness,
    workspace: workbench.readyWorkspace,
    selectedMaterials: workbench.selectedMaterials,
    refreshProductSnapshot: workbench.refreshProductSnapshot,
    refreshSettledProductState: workbench.refreshSettledProductState,
  })
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
        <MaterialsPane workbench={workbench} productChat={productChat} />
        <PreviewPane
          selectedMaterials={workbench.selectedMaterials}
          activeMaterialId={workbench.activeMaterialId}
          previewView={workbench.previewView}
          evidenceFocus={workbench.evidenceFocus}
          onSelectTab={workbench.selectMaterialTab}
        />
        <aside className="chat-dock" aria-label="AY Chat" hidden={!chatOpen}>
          <ProductChatDock
            controller={productChat}
            accountReadiness={workbench.accountReadiness}
            history={workbench.history}
            confirmedRevision={workbench.readyWorkspace?.confirmedRevision}
            materials={workbench.readyWorkspace?.materials ?? []}
            bootstrapRefreshing={workbench.bootstrapRefreshing}
            onNavigateEvidence={workbench.navigateToEvidence}
          />
        </aside>
      </div>
    </div>
  )
}

function MaterialsPane({
  workbench,
  productChat,
}: {
  readonly workbench: ReturnType<typeof useSourceWorkbench>
  readonly productChat: ReturnType<typeof useProductChat>
}) {
  const [courseName, setCourseName] = useState('문제해결글쓰기')
  const view = workbench.workspaceView
  const productBusy = productChat.operationPending
  const mutationPending = workbench.mutationPending || productBusy

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
            disabled={mutationPending}
            onClick={() => void workbench.refreshMaterials()}
          >
            <RefreshCw size={17} />
          </button>
        ) : null}
      </div>

      <WorkspaceState
        view={view}
        pending={mutationPending}
        onRetry={() => void workbench.loadWorkspace()}
        onActivate={() => void workbench.activateWorkspace()}
        onRefresh={() => void workbench.refreshMaterials()}
      />

      {workbench.operationFailure ? (
        <div className="workspace-state-card is-error" role="alert">
          <strong>요청을 완료하지 못했습니다</strong>
          <span>{workbench.operationFailure}</span>
        </div>
      ) : null}

      {workbench.materialRefreshOutcome ? (
        <div className="workspace-state-card" role="status">
          <strong>
            {workbench.materialRefreshOutcome === 'source_rebaselined'
              ? '현재 TXT를 새 기준으로 채택했습니다'
              : '자료 목록을 새로고침했습니다'}
          </strong>
          <span>
            {workbench.materialRefreshOutcome === 'source_rebaselined'
              ? '원본 bytes는 그대로 두고 등록 digest만 현재 내용에 맞췄습니다.'
              : '현재 학기 폴더의 등록 가능한 TXT를 다시 확인했습니다.'}
          </span>
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
                    disabled={mutationPending}
                    onChange={(event) => setCourseName(event.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={
                      mutationPending || courseName.trim().length === 0
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
                      disabled={
                        selectionFull ||
                        productBusy ||
                        Boolean(workbench.readyWorkspace?.recovery)
                      }
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
            className="assignment-action-button"
            type="button"
            disabled={!productChat.canStartAssignment || workbench.mutationPending}
            onClick={() => void productChat.startAssignment()}
          >
            {productChat.operationPending ? (
              <Clock3 size={17} className="spinning-icon" />
            ) : (
              <Sparkles size={17} />
            )}
            <span>
              <strong>선택한 자료 정리하기</strong>
              <small>
                {workbench.selectedMaterialIds.length === 2
                  ? '두 TXT에서 과제 정보를 찾아 변경 제안으로 준비합니다.'
                  : 'TXT 자료 두 개를 먼저 선택해 주세요.'}
              </small>
            </span>
          </button>

          <button
            className="change-workspace-button"
            type="button"
            disabled={mutationPending}
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
  onRefresh,
}: {
  readonly view: ProductWorkspaceView
  readonly pending: boolean
  readonly onRetry: () => void
  readonly onActivate: () => void
  readonly onRefresh: () => void
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
  if (view.workspace.recovery) {
    const sourceConflict =
      view.workspace.recovery.state === 'source_conflict'
    return (
      <div className="workspace-state-card is-error" role="alert">
        <strong>
          {sourceConflict
            ? '원본 자료 변경을 확인해 주세요'
            : '작업공간 복구가 필요합니다'}
        </strong>
        <span>{view.workspace.recovery.displayMessage}</span>
        <button
          type="button"
          disabled={pending}
          onClick={sourceConflict ? onRefresh : onActivate}
        >
          {sourceConflict
            ? '현재 TXT를 새 기준으로 채택'
            : '작업공간 다시 선택'}
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
  evidenceFocus,
  onSelectTab,
}: {
  readonly selectedMaterials: readonly ProductRawMaterial[]
  readonly activeMaterialId: string | undefined
  readonly previewView: ProductPreviewView
  readonly evidenceFocus: ProductEvidenceFocus | undefined
  readonly onSelectTab: (materialId: string) => void
}) {
  const evidenceMarker = useRef<HTMLElement>(null)
  const focusedQuote =
    previewView.state === 'loaded' &&
    evidenceFocus?.materialId === previewView.preview.materialId &&
    evidenceFocus.digest === previewView.preview.digest &&
    previewView.preview.text.includes(evidenceFocus.quote)
      ? evidenceFocus.quote
      : undefined

  useEffect(() => {
    if (!focusedQuote) return
    evidenceMarker.current?.scrollIntoView({ block: 'center' })
    evidenceMarker.current?.focus({ preventScroll: true })
  }, [focusedQuote, evidenceFocus])

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
              <span>원문 확인됨</span>
            </div>
            <pre aria-label={`${previewView.preview.relativePath} 원문`}>
              {focusedQuote ? (
                <>
                  {previewView.preview.text.slice(
                    0,
                    previewView.preview.text.indexOf(focusedQuote),
                  )}
                  <mark
                    ref={evidenceMarker}
                    tabIndex={-1}
                    aria-label="선택한 원문 근거"
                  >
                    {focusedQuote}
                  </mark>
                  {previewView.preview.text.slice(
                    previewView.preview.text.indexOf(focusedQuote) +
                      focusedQuote.length,
                  )}
                </>
              ) : (
                previewView.preview.text
              )}
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

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`
}
