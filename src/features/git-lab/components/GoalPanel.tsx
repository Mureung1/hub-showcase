import CommitGraphSvg, { type CommitGraphBranch, type CommitGraphCommit } from './CommitGraphSvg'
import styles from './GoalPanel.module.css'

type GoalPanelProps = {
  title: string
  description: string
  chapterTitle: string
  proGitSection: string
  conceptSummary: string
  acceptedCommands: string[]
  visualMode: string
  commits: CommitGraphCommit[]
  branches: CommitGraphBranch[]
  currentBranch: string | null
  cleared: boolean
  hidden: boolean
}

export default function GoalPanel({
  title,
  description,
  chapterTitle,
  proGitSection,
  conceptSummary,
  acceptedCommands,
  visualMode,
  commits,
  branches,
  currentBranch,
  cleared,
  hidden,
}: GoalPanelProps) {
  return (
    <aside className={styles.panel} aria-label="목표 커밋 그래프">
      <div className={styles.windowHeader}>
        <div className={styles.trafficLights} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <strong>Lesson Goal</strong>
        <span className={cleared ? styles.clearBadge : styles.pendingBadge}>
          {cleared ? '클리어' : '진행 중'}
        </span>
      </div>

      {hidden ? (
        <div className={styles.hiddenState}>목표가 숨겨져 있습니다.</div>
      ) : (
        <div className={styles.body}>
          <div className={styles.copy}>
            <span className={styles.modeBadge}>{formatVisualMode(visualMode)}</span>
            <p className={styles.chapter}>{chapterTitle}</p>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>

          <section className={styles.lessonCard} aria-labelledby="git-lab-concept-title">
            <h3 id="git-lab-concept-title">이번 레슨에서 볼 것</h3>
            <p>{conceptSummary}</p>
            <dl className={styles.metaList}>
              <div>
                <dt>Pro Git 기준</dt>
                <dd>{proGitSection}</dd>
              </div>
              <div>
                <dt>허용 명령</dt>
                <dd className={styles.commandList}>
                  {acceptedCommands.map((command) => (
                    <code key={command}>{command}</code>
                  ))}
                </dd>
              </div>
            </dl>
          </section>

          <div className={styles.graphFrame}>
            <CommitGraphSvg
              branches={branches}
              commits={commits}
              currentBranch={currentBranch}
              layoutOptions={{
                laneGap: 104,
                rowGap: 78,
                paddingX: 54,
                paddingY: 50,
                nodeRadius: 21,
              }}
            />
          </div>
        </div>
      )}
    </aside>
  )
}

function formatVisualMode(visualMode: string) {
  return visualMode
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
