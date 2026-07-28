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

import type {
  ProductWorkspaceSource,
  ProductWorkspaceTextPreview,
} from '@ay-ple/product-contract'

import {
  fetchPreparedWorkspacePdf,
  fetchPreparedWorkspaceSources,
  fetchPreparedWorkspaceText,
  PreparedProductApiError,
} from './prepared-product-api.js'
import {
  resolvePreparedEvidenceHighlight,
  type PreparedEvidenceTarget,
} from './prepared-source-evidence.js'

export type { PreparedEvidenceTarget } from './prepared-source-evidence.js'

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
  readonly previewView: SourcePreviewView
  readonly evidenceFocus: PreparedEvidenceTarget | undefined
  readonly evidenceNotice: string | undefined
  readonly reload: () => Promise<void>
  readonly selectSource: (source: ProductWorkspaceSource) => void
  readonly navigateEvidence: (target: PreparedEvidenceTarget) => void
}

export function usePreparedWorkspaceSources(
  enabled: boolean,
): PreparedWorkspaceSourcesController {
  const [listView, setListView] = useState<SourceListView>({ state: 'idle' })
  const [selectedPath, setSelectedPath] = useState<string>()
  const [previewView, setPreviewView] = useState<SourcePreviewView>({
    state: 'idle',
  })
  const [evidenceFocus, setEvidenceFocus] = useState<PreparedEvidenceTarget>()
  const [evidenceNotice, setEvidenceNotice] = useState<string>()
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
      setPreviewView({ state: 'idle' })
      setEvidenceFocus(undefined)
      setEvidenceNotice(undefined)
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

    const controller = new AbortController()
    setPreviewView({ state: 'loading', source: selectedSource })
    if (selectedSource.previewKind === 'pdf') {
      void fetchPreparedWorkspacePdf(
        selectedSource.relativePath,
        controller.signal,
      )
        .then(async (pdf) => {
          if (
            controller.signal.aborted ||
            generation !== previewGeneration.current
          ) {
            return
          }
          const url = await readBlobDataUrl(pdf, controller.signal)
          if (
            controller.signal.aborted ||
            generation !== previewGeneration.current
          ) {
            return
          }
          setPreviewView({
            state: 'pdf',
            source: selectedSource,
            url,
          })
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
    }

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
    setEvidenceFocus(undefined)
    setEvidenceNotice(undefined)
    setSelectedPath(source.relativePath)
    setPreviewRefresh((current) => current + 1)
  }, [])
  const navigateEvidence = useCallback(
    (target: PreparedEvidenceTarget) => {
      setEvidenceFocus(undefined)
      setEvidenceNotice(undefined)
      void loadSources().then((freshSources) => {
        if (!freshSources) return
        if (
          !freshSources.some(
            (source) => source.relativePath === target.relativePath,
          )
        ) {
          setEvidenceNotice(
            '이 근거 파일은 현재 안전한 자료 목록에서 열 수 없습니다.',
          )
          return
        }
        setEvidenceFocus(target)
        setSelectedPath(target.relativePath)
        setPreviewRefresh((current) => current + 1)
      })
    },
    [loadSources],
  )

  return {
    listView,
    selectedSource,
    previewView,
    evidenceFocus,
    evidenceNotice,
    reload,
    selectSource,
    navigateEvidence,
  }
}

export function PreparedSourceWorkbench({
  controller,
}: {
  readonly controller: PreparedWorkspaceSourcesController
}) {
  return (
    <>
      <SourceExplorer controller={controller} />
      <SourcePreview controller={controller} />
    </>
  )
}

function SourceExplorer({
  controller,
}: {
  readonly controller: PreparedWorkspaceSourcesController
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
            <section className="source-group" key={group.directory}>
              <h2>
                <FolderOpen size={13} />
                {group.directory || '학기 루트'}
              </h2>
              <ul>
                {group.sources.map((source) => (
                  <li key={source.relativePath}>
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
      {controller.evidenceNotice ? (
        <div className="preview-notice is-error" role="status">
          {controller.evidenceNotice}
        </div>
      ) : null}
      <section className="paper-preview">
        <PreviewBody
          preview={controller.previewView}
          evidenceFocus={controller.evidenceFocus}
        />
      </section>
    </main>
  )
}

function PreviewBody({
  preview,
  evidenceFocus,
}: {
  readonly preview: SourcePreviewView
  readonly evidenceFocus: PreparedEvidenceTarget | undefined
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
      <iframe
        className="pdf-preview"
        aria-label={`${preview.source.relativePath} PDF 미리보기`}
        title={`${preview.source.relativePath} PDF 미리보기`}
        src={preview.url}
        referrerPolicy="no-referrer"
      />
    )
  }
  return (
    <TextPreview
      source={preview.source}
      preview={preview.preview}
      evidenceFocus={evidenceFocus}
    />
  )
}

function TextPreview({
  source,
  preview,
  evidenceFocus,
}: {
  readonly source: ProductWorkspaceSource
  readonly preview: ProductWorkspaceTextPreview
  readonly evidenceFocus: PreparedEvidenceTarget | undefined
}) {
  const marker = useRef<HTMLElement>(null)
  const evidence = resolvePreparedEvidenceHighlight(
    source.relativePath,
    preview,
    evidenceFocus,
  )
  const quoteIndex = evidence.state === 'focused' ? evidence.quoteIndex : -1
  const focusedQuote =
    evidence.state === 'focused'
      ? evidenceFocus?.quote
      : undefined

  useEffect(() => {
    if (!focusedQuote) return
    marker.current?.scrollIntoView({ block: 'center' })
    marker.current?.focus({ preventScroll: true })
  }, [focusedQuote])

  return (
    <article className="source-document">
      <div className="source-document-meta">
        <span>텍스트 원문</span>
        <span>{formatBytes(source.size)}</span>
        <span>현재 파일 확인됨</span>
      </div>
      <EvidenceStatus evidence={evidence} />
      <pre aria-label={`${preview.relativePath} 원문`}>
        {focusedQuote ? (
          <>
            {preview.text.slice(0, quoteIndex)}
            <mark
              ref={marker}
              tabIndex={-1}
              aria-label="선택한 원문 근거"
            >
              {focusedQuote}
            </mark>
            {preview.text.slice(quoteIndex + focusedQuote.length)}
          </>
        ) : (
          preview.text
        )}
      </pre>
      {preview.truncated ? (
        <p className="preview-truncated">
          안전한 미리보기 범위까지만 표시했습니다.
        </p>
      ) : null}
    </article>
  )
}

function EvidenceStatus({
  evidence,
}: {
  readonly evidence: ReturnType<typeof resolvePreparedEvidenceHighlight>
}) {
  if (evidence.state === 'digest_mismatch') {
    return (
      <p className="preview-notice is-error" role="status">
        검토 근거와 현재 파일의 내용이 달라 근거 위치를 표시하지
        못했습니다.
      </p>
    )
  }
  if (evidence.state === 'outside_preview') {
    return (
      <p className="preview-notice" role="status">
        현재 파일은 검토 근거와 일치하지만 근거 위치가 안전한 미리보기
        범위 밖에 있습니다.
      </p>
    )
  }
  if (evidence.state === 'locator_mismatch') {
    return (
      <p className="preview-notice is-error" role="status">
        현재 파일은 검토 근거와 일치하지만 지정된 근거 위치를 찾지
        못했습니다.
      </p>
    )
  }
  return null
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
  const grouped = new Map<string, ProductWorkspaceSource[]>()
  for (const source of sources) {
    const slash = source.relativePath.lastIndexOf('/')
    const directory =
      slash < 0 ? '' : source.relativePath.slice(0, slash)
    const current = grouped.get(directory) ?? []
    current.push(source)
    grouped.set(directory, current)
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'ko'))
    .map(([directory, group]) => ({
      directory,
      sources: [...group].sort((left, right) =>
        left.relativePath.localeCompare(right.relativePath, 'ko'),
      ),
    }))
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

function readBlobDataUrl(
  blob: Blob,
  signal: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const abort = () => reader.abort()
    signal.addEventListener('abort', abort, { once: true })
    reader.addEventListener('load', () => {
      signal.removeEventListener('abort', abort)
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('invalid PDF data URL'))
    }, { once: true })
    reader.addEventListener('error', () => {
      signal.removeEventListener('abort', abort)
      reject(reader.error ?? new Error('PDF read failed'))
    }, { once: true })
    reader.addEventListener('abort', () => {
      signal.removeEventListener('abort', abort)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
    reader.readAsDataURL(blob)
  })
}
