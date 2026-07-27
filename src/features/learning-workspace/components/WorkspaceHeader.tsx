import { Link } from 'react-router'
import type { RunState } from '../workspaceInteraction'
import {
  createRunStateLabel,
  createWorkspaceModeDescription,
  createWorkspaceModeLabel,
  type WorkspaceMission,
} from '../workspaceMission'
import styles from '../LearningWorkspace.module.css'

type WorkspaceHeaderProps = {
  mission: WorkspaceMission
  executionPanelTitle: string
  runtimeStatus: RunState
  runtimeSummaryItems: Array<{ label: string; value: string }>
  progressPercent: number
  passedCount: number
  testCaseCount: number
  isRunning: boolean
  runState: RunState
  missionCompleted: boolean
  failedCount: number
}

export function WorkspaceHeader({
  mission,
  executionPanelTitle,
  runtimeStatus,
  runtimeSummaryItems,
  progressPercent,
  passedCount,
  testCaseCount,
  isRunning,
  runState,
  missionCompleted,
  failedCount,
}: WorkspaceHeaderProps) {
  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.trackSummary}>
          <span className={styles.kicker}>Learning Workspace</span>
          <h1 id="workspace-title">{mission.title}</h1>
          <p>
            {mission.trackTitle} · {mission.stepLabel}
          </p>
        </div>
        <nav className={styles.actions} aria-label="학습 화면 이동">
          <Link to="/today" className={styles.secondaryButton}>
            오늘 학습
          </Link>
          <Link to="/today#tracks-title" className={styles.secondaryButton}>
            학습 목록
          </Link>
        </nav>
      </header>

      <section className={styles.runtimeStrip} aria-label="실행 환경 요약">
        <div className={styles.runtimeStripHeader}>
          <div>
            <span>{createWorkspaceModeLabel(mission.mode)}</span>
            <strong>{executionPanelTitle}</strong>
            <p>{createWorkspaceModeDescription(mission.mode)}</p>
          </div>
          <span className={styles.runtimeState} data-state={runtimeStatus}>
            {createRunStateLabel(runtimeStatus)}
          </span>
        </div>
        <dl className={styles.runtimeDetails}>
          {runtimeSummaryItems.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
        <Link className={styles.runtimePreviewLink} to="/workspace?mission=counter-mission">
          React 미리보기 연습
        </Link>
      </section>

      <section className={styles.statusStrip} aria-label="학습 상태 요약">
        <article>
          <span>진행률</span>
          <strong>{progressPercent}%</strong>
          <div>
            <i style={{ width: `${progressPercent}%` }} />
          </div>
        </article>
        <article>
          <span>테스트</span>
          <strong>
            {passedCount} / {testCaseCount}
          </strong>
          <small>{isRunning ? createRunStateLabel(runState) : '현재 통과'}</small>
        </article>
        <article>
          <span>예상 시간</span>
          <strong>{mission.durationMinutes}분</strong>
          <small>오늘 미션</small>
        </article>
        <article>
          <span>학습 상태</span>
          <strong>{missionCompleted ? '완료' : failedCount > 0 ? '점검' : '준비'}</strong>
          <small>
            {isRunning
              ? '채점 중'
              : missionCompleted
                ? '마침'
                : failedCount > 0
                  ? '개선 필요'
                  : '시작 가능'}
          </small>
        </article>
      </section>
    </>
  )
}
