import styles from './LearningWorkspace.module.css'

type StepState = 'done' | 'current' | 'waiting'

type CurriculumStep = {
  title: string
  state: StepState
}

const curriculumSteps: CurriculumStep[] = [
  { title: '컴포넌트 구조', state: 'done' },
  { title: 'props 전달', state: 'done' },
  { title: 'state와 이벤트', state: 'current' },
  { title: '테스트 실행', state: 'waiting' },
  { title: '코드 리뷰', state: 'waiting' },
]

const sourceLinks = ['React Docs: State: A Component Memory', 'React Docs: Responding to Events']

const codeLines = [
  "import { useState } from 'react'",
  '',
  'function Counter() {',
  '  const [count, setCount] = useState(0)',
  '',
  '  return (',
  '    <button onClick={() => setCount(count + 1)}>',
  '      {count}',
  '    </button>',
  '  )',
  '}',
]

function stateLabel(state: StepState) {
  if (state === 'done') {
    return '완료'
  }

  if (state === 'current') {
    return '현재'
  }

  return '대기'
}

export default function LearningWorkspace() {
  return (
    <section className={styles.page} aria-labelledby="workspace-title">
      <header className={styles.topbar}>
        <div className={styles.trackSummary}>
          <h1 id="workspace-title">React 입문 / Step 3 of 5</h1>
          <span className={styles.progressBadge}>오늘 62%</span>
          <span className={styles.remainingTime}>예상 35분 남음</span>
        </div>
        <nav className={styles.actions} aria-label="학습 화면 이동">
          <button type="button" className={styles.secondaryButton}>
            오늘 학습
          </button>
          <button type="button" className={styles.secondaryButton}>
            학습 목록
          </button>
        </nav>
      </header>

      <div className={styles.workspaceGrid}>
        <aside className={styles.curriculumPanel} aria-label="오늘 커리큘럼">
          <h2>오늘 커리큘럼</h2>
          <ol className={styles.stepList}>
            {curriculumSteps.map((step) => (
              <li className={styles.stepItem} key={step.title}>
                <span className={styles.stepState} data-state={step.state}>
                  {stateLabel(step.state)}
                </span>
                <span>{step.title}</span>
              </li>
            ))}
          </ol>

          <div className={styles.divider} />

          <article className={styles.missionSummary}>
            <span className={styles.sectionLabel}>현재 미션</span>
            <h3>Counter 컴포넌트 실습</h3>
            <p>버튼을 클릭할 때마다 count가 1씩 증가하도록 구현합니다.</p>
          </article>

          <article className={styles.criteria}>
            <span className={styles.sectionLabel}>통과 조건</span>
            <ul>
              <li>숫자가 화면에 표시됨</li>
              <li>클릭마다 +1 증가</li>
              <li>테스트 3개 통과</li>
            </ul>
          </article>
        </aside>

        <main className={styles.guidePanel} aria-label="학습 가이드">
          <div className={styles.panelHeader}>
            <h2>학습 가이드</h2>
            <span className={styles.sourceBadge}>공식 문서 기반</span>
          </div>

          <article className={styles.explanationCard}>
            <h3>state는 컴포넌트의 기억입니다</h3>
            <p>
              props는 부모가 전달하는 값이고, state는 컴포넌트 내부에서 바뀌는 값입니다. Counter처럼
              사용자 행동에 따라 화면이 바뀌어야 할 때 state를 사용합니다.
            </p>
          </article>

          <article className={styles.practiceCard}>
            <span className={styles.sectionLabel}>이번 실습</span>
            <p>버튼을 클릭하면 count가 1씩 증가하도록 useState와 onClick을 연결하세요.</p>
            <button type="button" className={styles.inlineAction}>
              코드에서 확인하기
            </button>
          </article>

          <article className={styles.hintCard}>
            <span className={styles.sectionLabel}>힌트</span>
            <p>
              정답을 바로 보기 전에, button의 onClick 안에서 setCount를 호출하는 흐름을 먼저
              확인해보세요.
            </p>
          </article>

          <article className={styles.sources}>
            <span className={styles.sectionLabel}>참고 문서</span>
            <ul>
              {sourceLinks.map((source) => (
                <li key={source}>{source}</li>
              ))}
            </ul>
          </article>
        </main>

        <section className={styles.editorPanel} aria-label="코드 에디터">
          <div className={styles.editorToolbar}>
            <span>Counter.jsx</span>
            <div className={styles.editorActions}>
              <span className={styles.languageBadge}>React</span>
              <button type="button" className={styles.runButton}>
                실행
              </button>
            </div>
          </div>
          <pre className={styles.codeBlock} aria-label="Counter.jsx 코드">
            {codeLines.map((line, index) => (
              <code key={`${index}-${line}`}>
                <span>{index + 1}</span>
                {line || ' '}
              </code>
            ))}
          </pre>
        </section>
      </div>

      <section className={styles.resultPanel} aria-label="실행 결과">
        <div>
          <div className={styles.resultHeader}>
            <h2>실행 결과</h2>
            <span className={styles.warningBadge}>2/3 통과</span>
          </div>
          <p className={styles.resultMessage}>
            실패: 클릭 이벤트는 연결되었지만 state 업데이트가 누락되었습니다.
          </p>
          <p className={styles.resultDetail}>
            다음 실행 전에 setCount(count + 1)가 클릭 핸들러 안에서 호출되는지 확인하세요.
          </p>
        </div>
        <div className={styles.resultActions}>
          <button type="button" className={styles.secondaryButton}>
            힌트 보기
          </button>
          <button type="button" className={styles.secondaryButton}>
            코드 리뷰 요청
          </button>
          <button type="button" className={styles.primaryButton}>
            다시 실행
          </button>
        </div>
      </section>
    </section>
  )
}
