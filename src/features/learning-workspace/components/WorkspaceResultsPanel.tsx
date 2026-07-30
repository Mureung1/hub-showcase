import * as Collapsible from '@radix-ui/react-collapsible'
import type { LearningActivityItem } from '../../learning-progress/model/useLearningProgressStore'
import type { TestCase, TestState } from '../workspaceInteraction'
import styles from '../LearningWorkspace.module.css'

type WorkspaceResultsPanelProps = {
  activityLog: LearningActivityItem[]
  canAdvance: boolean
  failedCount: number
  nextStepButtonLabel: string
  onAdvanceStep: () => void
  onShowHint: () => void
  onShowReview: () => void
  passedCount: number
  pendingCount: number
  resultMessage: string
  testCases: TestCase[]
}

function testStateLabel(state: TestState) {
  if (state === 'passed') return '통과'
  if (state === 'failed') return '실패'
  return '대기'
}

export function WorkspaceResultsPanel({
  activityLog,
  canAdvance,
  failedCount,
  nextStepButtonLabel,
  onAdvanceStep,
  onShowHint,
  onShowReview,
  passedCount,
  pendingCount,
  resultMessage,
  testCases,
}: WorkspaceResultsPanelProps) {
  return (
    <section className={styles.resultPanel} aria-label="실행 결과">
      <div className={styles.resultMain}>
        <div className={styles.resultHeader} aria-live="polite">
          <div>
            <h2>테스트 결과</h2>
            <p>{resultMessage}</p>
          </div>
          <div className={styles.resultBadges}>
            <span data-state="passed">통과 {passedCount}</span>
            <span data-state="failed">실패 {failedCount}</span>
            <span data-state="pending">대기 {pendingCount}</span>
          </div>
        </div>

        <Collapsible.Root defaultOpen={false}>
          <Collapsible.Trigger className={styles.planToggleTrigger}>
            테스트 케이스 보기
          </Collapsible.Trigger>
          <Collapsible.Content>
            <div className={styles.testTable} role="table" aria-label="테스트 케이스">
              <div role="row">
                <span role="columnheader">케이스</span>
                <span role="columnheader">입력</span>
                <span role="columnheader">예상</span>
                <span role="columnheader">실제</span>
                <span role="columnheader">결과</span>
              </div>
              {testCases.map((testCase) => (
                <div role="row" key={testCase.id}>
                  <span role="cell">{testCase.id}</span>
                  <span role="cell">{testCase.input}</span>
                  <span role="cell">{testCase.expected}</span>
                  <span role="cell">{testCase.actual}</span>
                  <span role="cell" data-state={testCase.state}>
                    {testStateLabel(testCase.state)}
                  </span>
                </div>
              ))}
            </div>
          </Collapsible.Content>
        </Collapsible.Root>
      </div>

      <aside className={styles.helpPanel} aria-label="도움말과 활동 기록">
        <section>
          <h3>지금 할 수 있는 일</h3>
          <button type="button" onClick={onShowHint}>
            힌트 보기
          </button>
          <button type="button" onClick={onShowReview}>
            코드 리뷰 요청
          </button>
          <button
            type="button"
            className={styles.nextStepButton}
            disabled={!canAdvance}
            onClick={onAdvanceStep}
          >
            {nextStepButtonLabel}
          </button>
        </section>
        <section>
          <Collapsible.Root defaultOpen={false}>
            <Collapsible.Trigger className={styles.planToggleTrigger}>
              활동 기록 보기
            </Collapsible.Trigger>
            <Collapsible.Content>
              <ol>
                {activityLog.map((item) => (
                  <li key={item.id}>
                    <time>{item.time}</time>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Collapsible.Content>
          </Collapsible.Root>
        </section>
      </aside>
    </section>
  )
}
