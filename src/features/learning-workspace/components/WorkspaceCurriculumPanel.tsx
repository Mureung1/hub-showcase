import { stateLabel, type CurriculumStep } from '../workspaceMission'
import styles from '../LearningWorkspace.module.css'

type WorkspaceCurriculumPanelProps = {
  missionTitle: string
  missionFileName: string
  curriculumSteps: CurriculumStep[]
  currentStepIndex: number
  totalSteps: number
  progressPercent: number
  hasSavedGeneratedPlan: boolean
  planTitle: string
  planSummary: string
  planSummaryItems: Array<{ label: string; value: string }>
  missionCompleted: boolean
}

export function WorkspaceCurriculumPanel({
  missionTitle,
  missionFileName,
  curriculumSteps,
  currentStepIndex,
  totalSteps,
  progressPercent,
  hasSavedGeneratedPlan,
  planTitle,
  planSummary,
  planSummaryItems,
  missionCompleted,
}: WorkspaceCurriculumPanelProps) {
  return (
    <aside className={styles.curriculumPanel} aria-label="오늘 커리큘럼">
      <section className={styles.railCard}>
        <div className={styles.railTitleRow}>
          <h2>현재 단계</h2>
          <span>
            {currentStepIndex} / {totalSteps}
          </span>
        </div>
        <div className={styles.currentStepCard}>
          <strong>{missionTitle}</strong>
          <p>{missionFileName}</p>
          <small>{curriculumSteps[currentStepIndex - 1]?.detail}</small>
          <div>
            <i style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </section>

      <section className={styles.railCard}>
        <div className={styles.railTitleRow}>
          <h2>생성된 계획</h2>
          <span className={styles.sourceBadge} data-fallback={!hasSavedGeneratedPlan}>
            {hasSavedGeneratedPlan ? '저장됨' : 'AI 임시 플랜'}
          </span>
        </div>
        <div className={styles.planOverview}>
          <strong>{planTitle}</strong>
          <p>{planSummary}</p>
          {planSummaryItems.map((item) => (
            <dl key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </dl>
          ))}
        </div>
      </section>

      <section className={styles.railCard}>
        <div className={styles.railTitleRow}>
          <h2>커리큘럼 단계</h2>
          <span>
            {missionCompleted
              ? '완료'
              : stateLabel(curriculumSteps[currentStepIndex - 1]?.state ?? 'current')}
          </span>
        </div>
        <ol className={styles.stepList}>
          {curriculumSteps.map((step, index) => (
            <li
              className={styles.stepItem}
              data-state={missionCompleted ? 'done' : step.state}
              key={`${step.title}-${index}`}
            >
              <span className={styles.stepIndex}>{index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
                <small>{missionCompleted ? '완료' : stateLabel(step.state)}</small>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  )
}
