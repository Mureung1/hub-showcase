import type { GitEngineState, GitFileStatus } from '../engine/gitEngine'
import styles from './RepositoryStatePanel.module.css'

type RepositoryStatePanelProps = {
  state: GitEngineState
}

const fileGroups: Array<{ title: string; statuses: GitFileStatus[]; emptyText: string }> = [
  { title: 'Working Tree', statuses: ['untracked', 'modified'], emptyText: '작업 트리 변경 없음' },
  { title: 'Staging Area', statuses: ['staged'], emptyText: 'staged 파일 없음' },
  { title: 'Repository', statuses: ['committed'], emptyText: 'committed 파일 없음' },
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
        <div className={styles.summaryItem}>
          <span>HEAD</span>
          <strong>{getHeadCommitId(state) ?? 'empty'}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Index</span>
          <strong>{state.indexCommitId ?? 'empty'}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Working Tree</span>
          <strong>{state.workingTreeCommitId ?? 'empty'}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Remotes</span>
          <strong>{state.remotes.length > 0 ? state.remotes.map((remote) => remote.name).join(', ') : 'None'}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Tags</span>
          <strong>{state.tags.length > 0 ? state.tags.map((tagItem) => tagItem.name).join(', ') : 'None'}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Stash</span>
          <strong>{state.stash.length}</strong>
        </div>
      </div>

      <div className={styles.fileGrid}>
        {fileGroups.map((group) => (
          <div className={styles.fileColumn} key={group.title}>
            <h3>{group.title}</h3>
            <div className={styles.fileList}>
              {getFilesByStatus(state, group.statuses).length > 0 ? (
                getFilesByStatus(state, group.statuses).map(([fileName, file]) => (
                  <code className={styles.fileBadge} key={fileName}>
                    {fileName}
                    <span>{file.status}</span>
                  </code>
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

function getFilesByStatus(state: GitEngineState, statuses: GitFileStatus[]) {
  return Object.entries(state.files).filter(([, file]) => statuses.includes(file.status))
}
function getHeadCommitId(state: GitEngineState) {
  if (state.head.type === 'detached') {
    return state.head.commitId
  }

  const branchName = state.head.branchName

  return state.branches.find((branch) => branch.name === branchName)?.commitId ?? null
}
