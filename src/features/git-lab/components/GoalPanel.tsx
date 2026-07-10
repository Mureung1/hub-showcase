import CommitGraphSvg, { type CommitGraphBranch, type CommitGraphCommit } from './CommitGraphSvg'
import styles from './GoalPanel.module.css'

type GoalPanelProps = {
  title: string
  description: string
  commits: CommitGraphCommit[]
  branches: CommitGraphBranch[]
  currentBranch: string | null
  cleared: boolean
  hidden: boolean
}

export default function GoalPanel({
  title,
  description,
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
        <strong>Goal Graph</strong>
        <span className={cleared ? styles.clearBadge : styles.pendingBadge}>
          {cleared ? '클리어' : '진행 중'}
        </span>
      </div>

      {hidden ? (
        <div className={styles.hiddenState}>목표가 숨겨져 있습니다.</div>
      ) : (
        <div className={styles.body}>
          <div className={styles.copy}>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
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
