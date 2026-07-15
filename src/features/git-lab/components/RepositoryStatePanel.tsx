import type { GitEngineState, GitFileStatus } from '../engine/gitEngine'
import styles from './RepositoryStatePanel.module.css'

type RepositoryStatePanelProps = {
  state: GitEngineState
}

const fileGroups: Array<{ title: string; status: GitFileStatus; emptyText: string }> = [
  { title: 'Working Tree', status: 'untracked', emptyText: '추적 전 파일 없음' },
  { title: 'Staging Area', status: 'staged', emptyText: 'staged 파일 없음' },
  { title: 'Repository', status: 'committed', emptyText: 'committed 파일 없음' },
]

export default function RepositoryStatePanel({ state }: RepositoryStatePanelProps) {
  return (
    <section className={styles.panel} aria-label="Repository state">
      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <span>Repository</span>
          <strong>{state.repoExists ? 'Initialized' : 'Not initialized'}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>user.name</span>
          <strong>{state.config['user.name'] ?? 'Unset'}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>user.email</span>
          <strong>{state.config['user.email'] ?? 'Unset'}</strong>
        </div>
      </div>

      <div className={styles.fileGrid}>
        {fileGroups.map((group) => (
          <div className={styles.fileColumn} key={group.status}>
            <h3>{group.title}</h3>
            <div className={styles.fileList}>
              {getFilesByStatus(state, group.status).length > 0 ? (
                getFilesByStatus(state, group.status).map(([fileName]) => (
                  <code key={fileName}>{fileName}</code>
                ))
              ) : (
                <span>{group.emptyText}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function getFilesByStatus(state: GitEngineState, status: GitFileStatus) {
  return Object.entries(state.files).filter(([, file]) => file.status === status)
}