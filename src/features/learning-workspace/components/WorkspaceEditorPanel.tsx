import Editor from '@monaco-editor/react'
import type { RefObject } from 'react'
import type { RunState } from '../workspaceInteraction'
import {
  createRunStateLabel,
  createWorkspaceModeLabel,
  type CodeRunPreviewState,
  type ExecutionPanelModel,
  type WorkspaceEditorFile,
  type WorkspaceMission,
} from '../workspaceMission'
import styles from '../LearningWorkspace.module.css'

type WorkspaceEditorPanelProps = {
  mission: WorkspaceMission
  editorFiles: WorkspaceEditorFile[]
  activeFile: WorkspaceEditorFile | undefined
  isRunning: boolean
  runState: RunState
  executionPanel: ExecutionPanelModel
  runPreview: CodeRunPreviewState
  consoleLines: string[]
  iframeRef: (node: HTMLIFrameElement | null) => void
  previewUrl: string
  runButtonRef: RefObject<HTMLButtonElement | null>
  onSelectFile: (path: string) => void
  onRun: () => void
  onChangeActiveFile: (value: string) => void
  onResetActiveFile: () => void
}

export function WorkspaceEditorPanel({
  mission,
  editorFiles,
  activeFile,
  isRunning,
  runState,
  executionPanel,
  runPreview,
  consoleLines,
  iframeRef,
  previewUrl,
  runButtonRef,
  onSelectFile,
  onRun,
  onChangeActiveFile,
  onResetActiveFile,
}: WorkspaceEditorPanelProps) {
  return (
    <section className={styles.editorPanel} aria-label="코드 에디터와 실행 결과">
      <div className={styles.editorToolbar}>
        <div className={styles.editorTabs} role="tablist" aria-label="열린 파일">
          {editorFiles.map((file) => (
            <button
              type="button"
              role="tab"
              aria-selected={file.path === activeFile?.path}
              className={styles.editorTab}
              data-active={file.path === activeFile?.path}
              key={file.path}
              onClick={() => onSelectFile(file.path)}
            >
              {file.name}
            </button>
          ))}
        </div>
        <div className={styles.editorActions}>
          <span className={styles.languageBadge}>{createWorkspaceModeLabel(mission.mode)}</span>
          <button
            type="button"
            className={styles.runButton}
            disabled={isRunning}
            ref={runButtonRef}
            onClick={onRun}
          >
            {isRunning
              ? createRunStateLabel(runState)
              : runState === 'failed' || runState === 'timeout'
                ? '다시 실행'
                : '실행'}
          </button>
        </div>
      </div>
      <div className={styles.editorBody}>
        <div className={styles.codeBlock} aria-label={`${mission.fileName} 코드`}>
          <Editor
            height="100%"
            path={activeFile?.path}
            defaultPath={activeFile?.path}
            defaultLanguage={activeFile?.language}
            defaultValue={activeFile?.value}
            language={activeFile?.language}
            value={activeFile?.value ?? ''}
            saveViewState
            theme="vs-dark"
            onChange={(value) => onChangeActiveFile(value || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'SFMono-Regular', Consolas, monospace",
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
            }}
          />
        </div>
        <aside
          className={styles.previewPanel}
          data-mode={mission.mode}
          aria-label={executionPanel.ariaLabel}
        >
          <div className={styles.previewToolbar}>
            <div>
              <span>{executionPanel.title}</span>
              <strong>{executionPanel.statusLabel}</strong>
            </div>
            <div className={styles.previewActions} aria-label="실행 화면 작업">
              <button type="button" onClick={onRun} disabled={isRunning}>
                다시 실행
              </button>
              <button type="button" onClick={onResetActiveFile}>
                초기화
              </button>
            </div>
          </div>
          <div className={styles.previewViewport} data-state={runPreview.status}>
            {mission.mode === 'react' ? (
              <iframe
                ref={iframeRef}
                className={styles.renderedPreviewFrame}
                title={`${runPreview.preview?.componentName ?? mission.title} 실행 화면`}
                sandbox="allow-scripts allow-same-origin"
                src={previewUrl}
              />
            ) : (
              <div className={styles.previewEmpty}>
                <strong>{executionPanel.emptyTitle}</strong>
                <p>{executionPanel.emptyDetail}</p>
              </div>
            )}
          </div>
          <div
            className={styles.previewConsole}
            data-mode={mission.mode}
            data-state={runPreview.status}
            aria-live="polite"
          >
            <div>
              <strong>Console</strong>
              <span>{createRunStateLabel(runPreview.status)}</span>
            </div>
            {runPreview.error ? <p className={styles.previewError}>{runPreview.error}</p> : null}
            {runPreview.result ? <p>return: {runPreview.result}</p> : null}
            <ol>
              {consoleLines.map((line, index) => (
                <li key={`${index}-${line}`}>{line}</li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </section>
  )
}
