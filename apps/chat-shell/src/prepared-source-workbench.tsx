import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  File,
  FileText,
  FolderOpen,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react'

import {
  PRODUCT_ACTION_FILE_REF_MAX_ENTRIES,
  type ProductWorkspaceSource,
  type ProductWorkspaceTextPreview,
} from '@ay-ple/product-contract'

import {
  fetchPreparedWorkspaceSources,
  fetchPreparedWorkspaceText,
  preparedWorkspacePdfUrl,
  PreparedProductApiError,
} from './prepared-product-api.js'

type SourceListView =
  | { readonly state: 'idle' | 'loading' }
  | {
      readonly state: 'loaded'
      readonly sources: readonly ProductWorkspaceSource[]
    }
  | { readonly state: 'error'; readonly displayMessage: string }

type SourcePreviewView =
  | { readonly state: 'idle' }
  | {
      readonly state: 'loading'
      readonly source: ProductWorkspaceSource
    }
  | {
      readonly state: 'text'
      readonly source: ProductWorkspaceSource
      readonly preview: ProductWorkspaceTextPreview
    }
  | {
      readonly state: 'pdf'
      readonly source: ProductWorkspaceSource
      readonly url: string
      readonly requestGeneration: number
    }
  | {
      readonly state: 'unsupported'
      readonly source: ProductWorkspaceSource
    }
  | {
      readonly state: 'error'
      readonly source: ProductWorkspaceSource
      readonly displayMessage: string
    }

export type PreparedWorkspaceSourcesController = {
  readonly listView: SourceListView
  readonly selectedSource: ProductWorkspaceSource | undefined
  readonly selectedActionPaths: readonly string[]
  readonly previewView: SourcePreviewView
  readonly citationNotice: string | undefined
  readonly reload: () => Promise<void>
  readonly selectSource: (source: ProductWorkspaceSource) => void
  readonly toggleActionSource: (source: ProductWorkspaceSource) => void
  readonly navigateCitation: (relativePath: string) => void
}

export type PreparedSourceActionControls = {
  readonly invocationEnabled: boolean
  readonly selectionLocked: boolean
  readonly onInvoke: (relativePaths: readonly string[]) => void
}

export function usePreparedWorkspaceSources(
  enabled: boolean,
): PreparedWorkspaceSourcesController {
  const [listView, setListView] = useState<SourceListView>({ state: 'idle' })
  const [selectedPath, setSelectedPath] = useState<string>()
  const [selectedActionPaths, setSelectedActionPaths] = useState<
    readonly string[]
  >([])
  const [previewView, setPreviewView] = useState<SourcePreviewView>({
    state: 'idle',
  })
  const [citationNotice, setCitationNotice] = useState<string>()
  const [previewRefresh, setPreviewRefresh] = useState(0)
  const listGeneration = useRef(0)
  const previewGeneration = useRef(0)

  const sources =
    listView.state === 'loaded' ? listView.sources : []
  const selectedSource = sources.find(
    (source) => source.relativePath === selectedPath,
  )

  const loadSources = useCallback(async (signal?: AbortSignal) => {
    const generation = listGeneration.current + 1
    listGeneration.current = generation
    setListView({ state: 'loading' })
    try {
      const result = await fetchPreparedWorkspaceSources(signal)
      if (generation !== listGeneration.current) return undefined
      setListView({ state: 'loaded', sources: result.sources })
      setSelectedActionPaths((current) =>
        reconcilePreparedActionPaths(current, result.sources),
      )
      setSelectedPath((current) => {
        if (
          current &&
          result.sources.some((source) => source.relativePath === current)
        ) {
          return current
        }
        return result.sources[0]?.relativePath
      })
      return result.sources
    } catch (error) {
      if (
        signal?.aborted ||
        generation !== listGeneration.current
      ) {
        return undefined
      }
      setListView({
        state: 'error',
        displayMessage: sourceErrorMessage(error),
      })
      setSelectedPath(undefined)
      return undefined
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      listGeneration.current += 1
      previewGeneration.current += 1
      setListView({ state: 'idle' })
      setSelectedPath(undefined)
      setSelectedActionPaths([])
      setPreviewView({ state: 'idle' })
      setCitationNotice(undefined)
      return
    }
    const controller = new AbortController()
    void loadSources(controller.signal)
    return () => controller.abort()
  }, [enabled, loadSources])

  useEffect(() => {
    const generation = previewGeneration.current + 1
    previewGeneration.current = generation
    if (!selectedSource) {
      setPreviewView({ state: 'idle' })
      return
    }
    if (selectedSource.previewKind === 'unsupported') {
      setPreviewView({ state: 'unsupported', source: selectedSource })
      return
    }

    if (selectedSource.previewKind === 'pdf') {
      setPreviewView({
        state: 'pdf',
        source: selectedSource,
        url: preparedWorkspacePdfUrl(selectedSource.relativePath),
        requestGeneration: generation,
      })
      return
    }

    const controller = new AbortController()
    setPreviewView({ state: 'loading', source: selectedSource })
    void fetchPreparedWorkspaceText(
      selectedSource.relativePath,
      controller.signal,
    )
      .then((preview) => {
        if (
          controller.signal.aborted ||
          generation !== previewGeneration.current
        ) {
          return
        }
        setPreviewView({ state: 'text', source: selectedSource, preview })
      })
      .catch((error: unknown) => {
        if (
          controller.signal.aborted ||
          generation !== previewGeneration.current
        ) {
          return
        }
        setPreviewView({
          state: 'error',
          source: selectedSource,
          displayMessage: sourceErrorMessage(error),
        })
      })
    return () => controller.abort()
  }, [previewRefresh, selectedSource])

  const reload = useCallback(
    async () => {
      await loadSources()
    },
    [loadSources],
  )
  const selectSource = useCallback((source: ProductWorkspaceSource) => {
    setCitationNotice(undefined)
    setSelectedPath(source.relativePath)
    setPreviewRefresh((current) => current + 1)
  }, [])
  const toggleActionSource = useCallback(
    (source: ProductWorkspaceSource) => {
      if (
        !sources.some(
          (candidate) =>
            candidate.relativePath === source.relativePath,
        )
      ) {
        return
      }
      setSelectedActionPaths((current) =>
        togglePreparedActionPath(current, source.relativePath, sources),
      )
    },
    [sources],
  )
  const navigateCitation = useCallback(
    (relativePath: string) => {
      setCitationNotice(undefined)
      void loadSources().then((freshSources) => {
        if (!freshSources) return
        if (
          !freshSources.some(
            (source) => source.relativePath === relativePath,
          )
        ) {
          setCitationNotice(
            '이 인용 자료는 현재 안전한 자료 목록에서 열 수 없습니다.',
          )
          return
        }
        setSelectedPath(relativePath)
        setPreviewRefresh((current) => current + 1)
      })
    },
    [loadSources],
  )

  return {
    listView,
    selectedSource,
    selectedActionPaths,
    previewView,
    citationNotice,
    reload,
    selectSource,
    toggleActionSource,
    navigateCitation,
  }
}

export function PreparedSourceWorkbench({
  controller,
  action,
}: {
  readonly controller: PreparedWorkspaceSourcesController
  readonly action: PreparedSourceActionControls
}) {
  return (
    <>
      <SourceExplorer controller={controller} action={action} />
      <SourcePreview controller={controller} />
    </>
  )
}

function SourceExplorer({
  controller,
  action,
}: {
  readonly controller: PreparedWorkspaceSourcesController
  readonly action: PreparedSourceActionControls
}) {
  const groups = useMemo(
    () =>
      controller.listView.state === 'loaded'
        ? groupSources(controller.listView.sources)
        : [],
    [controller.listView],
  )
  return (
    <aside className="materials-pane" aria-label="학기 자료">
      <div className="pane-heading">
        <div>
          <p className="eyebrow">SemesterWorkspace</p>
          <h1>학기 자료</h1>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="자료 다시 불러오기"
          disabled={controller.listView.state === 'loading'}
          onClick={() => void controller.reload()}
        >
          <RefreshCw
            className={
              controller.listView.state === 'loading'
                ? 'spinning-icon'
                : undefined
            }
            size={17}
          />
        </button>
      </div>
      <p className="materials-description">
        Git으로 관리되는 actual file을 읽기 전용으로 탐색합니다.
      </p>
      <div className="source-action-control">
        <button
          type="button"
          aria-describedby="source-action-status"
          disabled={
            controller.selectedActionPaths.length === 0 ||
            !action.invocationEnabled
          }
          onClick={() =>
            action.onInvoke([...controller.selectedActionPaths])
          }
        >
          선택한 자료로 학기 정보 정리하기 · {controller.selectedActionPaths.length}개
        </button>
        <p id="source-action-status">
          {controller.selectedActionPaths.length === 0
            ? '자료를 선택하면 AY에게 학기 정보 정리를 맡길 수 있습니다.'
            : action.invocationEnabled
              ? '선택한 actual file만 명시적인 AY 작업에 전달합니다.'
              : '현재 AY 작업을 시작할 수 없어 선택만 유지합니다.'}
        </p>
      </div>

      {controller.listView.state === 'idle' ||
      controller.listView.state === 'loading' ? (
        <div className="pane-state" role="status">
          <LoaderCircle className="spinning-icon" size={20} />
          <span>자료 목록을 불러오는 중입니다.</span>
        </div>
      ) : controller.listView.state === 'error' ? (
        <div className="pane-state is-error" role="alert">
          <File size={20} />
          <strong>자료 목록을 열지 못했습니다</strong>
          <span>{controller.listView.displayMessage}</span>
          <button type="button" onClick={() => void controller.reload()}>
            다시 시도
          </button>
        </div>
      ) : groups.length === 0 ? (
        <div className="pane-state">
          <FolderOpen size={22} />
          <strong>표시할 학기 자료가 없습니다</strong>
          <span>workspace에 자료를 추가한 뒤 다시 불러와 주세요.</span>
        </div>
      ) : (
        <div className="source-groups">
          {groups.map((group) => (
            <section
              className="source-group"
              key={group.sources[0]?.relativePath ?? group.directory}
            >
              <h2>
                <FolderOpen size={13} />
                {group.directory || '학기 루트'}
              </h2>
              <ul>
                {group.sources.map((source) => (
                  <li key={source.relativePath}>
                    <div className="source-row-shell">
                      <input
                        className="source-action-checkbox"
                        type="checkbox"
                        checked={controller.selectedActionPaths.includes(
                          source.relativePath,
                        )}
                        aria-disabled={
                          actionSelectionDisabledReason(
                            source,
                            controller.selectedActionPaths,
                            action.selectionLocked,
                          )
                            ? 'true'
                            : undefined
                        }
                        aria-label={actionSelectionLabel(
                          source,
                          controller.selectedActionPaths,
                          action.selectionLocked,
                        )}
                        title={
                          actionSelectionDisabledReason(
                            source,
                            controller.selectedActionPaths,
                            action.selectionLocked,
                          ) ?? undefined
                        }
                        onChange={() => {
                          if (
                            !actionSelectionDisabledReason(
                              source,
                              controller.selectedActionPaths,
                              action.selectionLocked,
                            )
                          ) {
                            controller.toggleActionSource(source)
                          }
                        }}
                      />
                      <button
                        className="source-row"
                        type="button"
                        aria-label={`${source.relativePath} 미리보기`}
                        aria-current={
                          source.relativePath ===
                          controller.selectedSource?.relativePath
                            ? 'true'
                            : undefined
                        }
                        onClick={() => controller.selectSource(source)}
                      >
                        <SourceIcon source={source} />
                        <span>
                          <strong>{fileName(source.relativePath)}</strong>
                          <small>
                            {previewKindLabel(source.previewKind)} ·{' '}
                            {formatBytes(source.size)}
                          </small>
                        </span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </aside>
  )
}

function SourcePreview({
  controller,
}: {
  readonly controller: PreparedWorkspaceSourcesController
}) {
  return (
    <main className="preview-pane" aria-label="자료 미리보기">
      <header className="preview-header">
        <div>
          <p className="eyebrow">Source preview</p>
          <h2>원본 자료</h2>
        </div>
        <span>
          {controller.selectedSource
            ? previewKindLabel(controller.selectedSource.previewKind)
            : '자료를 선택하세요'}
        </span>
      </header>
      {controller.selectedSource ? (
        <div className="source-tabs" aria-label="열린 자료">
          <div className="source-current-file">
            <SourceIcon source={controller.selectedSource} />
            {controller.selectedSource.relativePath}
          </div>
        </div>
      ) : null}
      {controller.citationNotice ? (
        <div className="preview-notice is-error" role="status">
          {controller.citationNotice}
        </div>
      ) : null}
      <section className="paper-preview">
        <PreviewBody preview={controller.previewView} />
      </section>
    </main>
  )
}

function PreviewBody({
  preview,
}: {
  readonly preview: SourcePreviewView
}) {
  if (preview.state === 'idle') {
    return (
      <div className="preview-empty-state">
        <FileText size={30} />
        <h3>자료를 선택해 내용을 확인하세요</h3>
        <p>
          왼쪽 자료 목록에서 파일을 선택하면 이곳에서 원본을 확인할 수
          있습니다.
        </p>
      </div>
    )
  }
  if (preview.state === 'loading') {
    return (
      <div className="preview-empty-state" role="status">
        <LoaderCircle className="spinning-icon" size={24} />
        <h3>원문을 불러오는 중입니다</h3>
        <p>{preview.source.relativePath}</p>
      </div>
    )
  }
  if (preview.state === 'error') {
    return (
      <div className="preview-empty-state is-error" role="alert">
        <FileText size={24} />
        <h3>원문을 열지 못했습니다</h3>
        <p>{preview.displayMessage}</p>
      </div>
    )
  }
  if (preview.state === 'unsupported') {
    return (
      <div className="preview-empty-state">
        <File size={30} />
        <h3>이 형식은 앱에서 미리볼 수 없습니다</h3>
        <p>
          {preview.source.relativePath} 파일은 workspace에서 그대로
          관리되며 AY가 필요할 때 직접 사용할 수 있습니다.
        </p>
      </div>
    )
  }
  if (preview.state === 'pdf') {
    return (
      <PdfPreview
        key={`${preview.source.relativePath}:${preview.requestGeneration}`}
        source={preview.source}
        url={preview.url}
      />
    )
  }
  return (
    <TextPreview
      source={preview.source}
      preview={preview.preview}
    />
  )
}

function PdfPreview({
  source,
  url,
}: {
  readonly source: ProductWorkspaceSource
  readonly url: string
}) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className="preview-empty-state is-error" role="alert">
        <FileText size={24} />
        <h3>원문을 열지 못했습니다</h3>
        <p>현재 workspace의 PDF를 안전하게 확인하지 못했습니다.</p>
      </div>
    )
  }
  return (
    <iframe
      className="pdf-preview"
      aria-label={`${source.relativePath} PDF 미리보기`}
      title={`${source.relativePath} PDF 미리보기`}
      src={url}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      onLoad={(event) => {
        try {
          const contentType =
            event.currentTarget.contentDocument?.contentType
          if (contentType && contentType !== 'application/pdf') {
            setFailed(true)
          }
        } catch {
          // A valid CSP-sandboxed PDF is intentionally cross-origin here.
        }
      }}
    />
  )
}

function TextPreview({
  source,
  preview,
}: {
  readonly source: ProductWorkspaceSource
  readonly preview: ProductWorkspaceTextPreview
}) {
  return (
    <article className="source-document">
      <div className="source-document-meta">
        <span>텍스트 원문</span>
        <span>{formatBytes(source.size)}</span>
        <span>현재 파일 미리보기</span>
      </div>
      <pre aria-label={`${preview.relativePath} 원문`}>{preview.text}</pre>
      {preview.truncated ? (
        <p className="preview-truncated">
          안전한 미리보기 범위까지만 표시했습니다.
        </p>
      ) : null}
    </article>
  )
}

function SourceIcon({
  source,
}: {
  readonly source: ProductWorkspaceSource
}) {
  return source.previewKind === 'text' ? (
    <FileText size={16} aria-hidden="true" />
  ) : (
    <File size={16} aria-hidden="true" />
  )
}

function groupSources(
  sources: readonly ProductWorkspaceSource[],
): readonly {
  readonly directory: string
  readonly sources: readonly ProductWorkspaceSource[]
}[] {
  const grouped: {
    directory: string
    sources: ProductWorkspaceSource[]
  }[] = []
  for (const source of sources) {
    const slash = source.relativePath.lastIndexOf('/')
    const directory =
      slash < 0 ? '' : source.relativePath.slice(0, slash)
    const current = grouped.at(-1)
    if (current?.directory === directory) {
      current.sources.push(source)
    } else {
      grouped.push({ directory, sources: [source] })
    }
  }
  return grouped
}

export function reconcilePreparedActionPaths(
  current: readonly string[],
  sources: readonly ProductWorkspaceSource[],
): readonly string[] {
  const selected = new Set(current)
  return sources
    .filter((source) => selected.has(source.relativePath))
    .map((source) => source.relativePath)
    .slice(0, PRODUCT_ACTION_FILE_REF_MAX_ENTRIES)
}

export function togglePreparedActionPath(
  current: readonly string[],
  relativePath: string,
  sources: readonly ProductWorkspaceSource[],
): readonly string[] {
  const reconciled = reconcilePreparedActionPaths(current, sources)
  const selected = new Set(reconciled)
  if (selected.has(relativePath)) {
    selected.delete(relativePath)
  } else {
    if (selected.size >= PRODUCT_ACTION_FILE_REF_MAX_ENTRIES) {
      return reconciled
    }
    selected.add(relativePath)
  }
  return reconcilePreparedActionPaths([...selected], sources)
}

function actionSelectionLabel(
  source: ProductWorkspaceSource,
  selectedActionPaths: readonly string[],
  selectionLocked: boolean,
): string {
  const reason = actionSelectionDisabledReason(
    source,
    selectedActionPaths,
    selectionLocked,
  )
  return reason
    ? `${source.relativePath} 학기 정보 정리 자료 선택 불가: ${reason}`
    : `${source.relativePath} 학기 정보 정리 자료 선택`
}

function actionSelectionDisabledReason(
  source: ProductWorkspaceSource,
  selectedActionPaths: readonly string[],
  selectionLocked: boolean,
): string | undefined {
  if (selectionLocked) {
    return 'AY 작업 중에는 선택을 바꿀 수 없습니다.'
  }
  if (
    selectedActionPaths.length >= PRODUCT_ACTION_FILE_REF_MAX_ENTRIES &&
    !selectedActionPaths.includes(source.relativePath)
  ) {
    return (
      `자료는 최대 ${PRODUCT_ACTION_FILE_REF_MAX_ENTRIES}개까지 ` +
      '선택할 수 있습니다.'
    )
  }
  return undefined
}

function fileName(relativePath: string): string {
  return relativePath.slice(relativePath.lastIndexOf('/') + 1)
}

function previewKindLabel(
  previewKind: ProductWorkspaceSource['previewKind'],
): string {
  if (previewKind === 'text') return 'TEXT'
  if (previewKind === 'pdf') return 'PDF'
  return 'FILE'
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function sourceErrorMessage(error: unknown): string {
  return error instanceof PreparedProductApiError
    ? error.displayMessage
    : '현재 workspace의 자료를 확인하지 못했습니다.'
}
