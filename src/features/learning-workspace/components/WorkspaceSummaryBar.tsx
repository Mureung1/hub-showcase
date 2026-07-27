import { Link } from 'react-router'
import * as Collapsible from '@radix-ui/react-collapsible'
import type { CurriculumStep } from '../workspaceMission'
import styles from '../LearningWorkspace.module.css'

type WorkspaceSummaryBarProps = {
  missionTitle: string
  missionTrackTitle: string
  missionFileName: string
  progressPercent: number
  curriculumSteps: CurriculumStep[]
  currentStepIndex: number
  hasSavedGeneratedPlan: boolean
  planTitle: string
  planSummary: string
  planSummaryItems: Array<{ label: string; value: string }>
  guideTitle: string
  guideDetail: string
  practiceDetail: string
  criteria: string[]
}

export function WorkspaceSummaryBar({
  missionTitle,
  missionTrackTitle,
  missionFileName,
  progressPercent,
  curriculumSteps,
  currentStepIndex,
  hasSavedGeneratedPlan,
  planTitle,
  planSummary,
  planSummaryItems,
  guideTitle,
  guideDetail,
  practiceDetail,
  criteria,
}: WorkspaceSummaryBarProps) {
  return (
    <section className={styles.summaryBar} aria-label="오늘의 미션 요약">
      <div className={styles.summaryBarTopRow}>
        <div className={styles.summaryBarTitle}>
          <h1 id="workspace-title">{missionTitle}</h1>
          <p>
            {missionTrackTitle} · {missionFileName}
          </p>
        </div>
        <nav className={styles.summaryBarActions} aria-label="학습 화면 이동">
          <Link to="/today" className={styles.secondaryButton}>
            오늘 학습
          </Link>
          <Link to="/today#tracks-title" className={styles.secondaryButton}>
            학습 목록
          </Link>
        </nav>
        <div className={styles.summaryBarProgress}>
          <div>
            <i style={{ width: `${progressPercent}%` }} />
          </div>
          <span>{progressPercent}%</span>
        </div>
        <Collapsible.Root className={styles.planToggle} defaultOpen={false}>
          <Collapsible.Trigger className={styles.planToggleTrigger}>계획 정보</Collapsible.Trigger>
          <span className={styles.sourceBadge} data-fallback={!hasSavedGeneratedPlan}>
            {hasSavedGeneratedPlan ? '저장됨' : 'AI 임시 플랜'}
          </span>
          <Collapsible.Content className={styles.planToggleContent}>
            <div className={styles.planOverview}>
              <div className={styles.railTitleRow}>
                <strong>{planTitle}</strong>
              </div>
              <p>{planSummary}</p>
              {planSummaryItems.map((item) => (
                <dl key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </dl>
              ))}
            </div>
          </Collapsible.Content>
        </Collapsible.Root>
      </div>

      <ol className={styles.stepperRow} aria-label="오늘 커리큘럼 단계">
        {curriculumSteps.map((step, index) => (
          <li key={`${step.title}-${index}`} className={styles.stepperPill} data-state={step.state}>
            <span className={styles.stepperPillIndex}>{index + 1}</span>
            <span className={styles.stepperPillTitle}>{step.title}</span>
          </li>
        ))}
      </ol>

      <div className={styles.conceptRow}>
        <div>
          <span className={styles.sectionLabel}>오늘의 개념 — {guideTitle}</span>
          <p>{guideDetail}</p>
        </div>
        <div>
          <span className={styles.sectionLabel}>이번 실습</span>
          <p>{practiceDetail}</p>
          <ul className={styles.criteriaList}>
            {criteria.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <p className={styles.summaryBarStepIndex} aria-hidden="true">
        {currentStepIndex} / {curriculumSteps.length}
      </p>
    </section>
  )
}
