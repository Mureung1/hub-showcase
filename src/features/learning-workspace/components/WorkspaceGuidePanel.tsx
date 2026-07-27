import type { RunState } from '../workspaceInteraction'
import type { WorkspaceMission } from '../workspaceMission'
import styles from '../LearningWorkspace.module.css'

type WorkspaceGuidePanelProps = {
  mission: WorkspaceMission
  hintVisible: boolean
  reviewVisible: boolean
  runState: RunState
}

export function WorkspaceGuidePanel({
  mission,
  hintVisible,
  reviewVisible,
  runState,
}: WorkspaceGuidePanelProps) {
  return (
    <main className={styles.guidePanel} aria-label="학습 가이드">
      <section className={styles.missionCard}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionLabel}>오늘의 미션</span>
            <h2>{mission.title}</h2>
          </div>
          <span className={styles.sourceBadge}>{mission.sourceLabel}</span>
        </div>
        <p>{mission.detail}</p>
        <ul className={styles.criteriaList}>
          {mission.criteria.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className={styles.tutorCard} aria-label="AI 튜터 안내">
        <div className={styles.tutorAvatar}>AI</div>
        <div>
          <strong>ICU 튜터</strong>
          <p>{mission.hint}</p>
        </div>
      </section>

      <article className={styles.explanationCard}>
        <span className={styles.sectionLabel}>개념 설명</span>
        <h3>{mission.guideTitle}</h3>
        <p>{mission.guideDetail}</p>
      </article>

      <article className={styles.practiceCard}>
        <span className={styles.sectionLabel}>이번 실습</span>
        <p>{mission.practiceDetail}</p>
      </article>

      {hintVisible ? (
        <article className={styles.hintCard} aria-live="polite">
          <span className={styles.sectionLabel}>힌트</span>
          <h3>먼저 바뀌는 지점을 찾아보세요</h3>
          <p>{mission.hint}</p>
        </article>
      ) : null}

      {reviewVisible ? (
        <article className={styles.reviewNoteCard} aria-live="polite">
          <span className={styles.sectionLabel}>코드 리뷰</span>
          <h3>{runState === 'passed' ? '좋은 흐름입니다' : '아직 확인할 실패 항목이 있습니다'}</h3>
          <p>
            {runState === 'passed'
              ? '필수 요구사항을 만족했습니다. 다음에는 상태가 바뀌는 이유를 짧은 주석이나 설명으로 정리해보세요.'
              : '실패한 케이스의 실제 결과를 먼저 보고, 예상과 달라진 값을 표시한 뒤 다시 실행하세요.'}
          </p>
        </article>
      ) : null}

      <article className={styles.sources}>
        <span className={styles.sectionLabel}>추천 근거와 출처</span>
        <ul>
          {mission.sources.map((source) => (
            <li key={source}>{source}</li>
          ))}
        </ul>
      </article>

      <form className={styles.tutorComposer}>
        <input placeholder="튜터에게 질문하기..." aria-label="튜터에게 질문하기" />
        <button type="button">전송</button>
      </form>
    </main>
  )
}
