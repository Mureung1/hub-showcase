import { Link, useSearchParams } from 'react-router'
import { generateMockCurriculum, type GeneratedCurriculumPlan } from '../../data/curriculumGenerator'
import { todayQueue, type TodayQueueItem } from '../../data/todayLearning'
import { useLearningProfileStore } from '../../stores/useLearningProfileStore'
import styles from './LearningWorkspace.module.css'

type StepState = 'done' | 'current' | 'waiting'
type TestState = 'passed' | 'failed' | 'pending'

type CurriculumStep = {
  title: string
  state: StepState
}

type WorkspaceMission = {
  id: string
  title: string
  detail: string
  durationMinutes: number
  fileName: string
  trackTitle: string
  stepLabel: string
  sourceLabel: string
  guideTitle: string
  guideDetail: string
  practiceDetail: string
  hint: string
  criteria: string[]
  sources: string[]
  codeLines: string[]
}

type TestCase = {
  id: string
  input: string
  expected: string
  actual: string
  state: TestState
  runtime: string
}

const defaultCareerGoal = 'DEVOPS 엔지니어가 되고 싶어'
const generatedMissionId = 'generated-first-mission'

const fallbackCodeLines = [
  "import React, { useState } from 'react'",
  '',
  'export default function Counter({ initial = 0 }) {',
  '  const [count, setCount] = useState(initial)',
  '',
  '  return (',
  '    <div className="counter">',
  '      <p className="count">{count}</p>',
  '      <button onClick={() => setCount(count + 1)}>',
  '        +1',
  '      </button>',
  '    </div>',
  '  )',
  '}',
]

const shellCodeLines = [
  '#!/bin/bash',
  'echo "check current directory"',
  'pwd',
  '',
  'echo "list files"',
  'ls -la',
  '',
  'echo "recent process"',
  'ps aux | head',
]

const apiCodeLines = [
  'from fastapi import FastAPI',
  '',
  'app = FastAPI()',
  '',
  '@app.get("/learning-topics/{topic}")',
  'def read_topic(topic: str):',
  '    return {"topic": topic, "status": "ready"}',
]

const activityItems = [
  { time: '10:15', title: '코드 제출', detail: '현재 미션 제출 준비' },
  { time: '10:12', title: '힌트 확인', detail: '상태 변경 흐름 확인' },
  { time: '10:08', title: '코드 실행', detail: '테스트 케이스 실행' },
]

function stateLabel(state: StepState) {
  if (state === 'done') {
    return '완료'
  }

  if (state === 'current') {
    return '진행 중'
  }

  return '예정'
}

function testStateLabel(state: TestState) {
  if (state === 'passed') {
    return '통과'
  }

  if (state === 'failed') {
    return '실패'
  }

  return '대기'
}

function createSteps(plan: GeneratedCurriculumPlan, selectedMissionId: string): CurriculumStep[] {
  if (selectedMissionId !== generatedMissionId) {
    return [
      { title: '개념 확인', state: 'done' },
      { title: '현재 미션', state: 'current' },
      { title: '테스트 실행', state: 'waiting' },
      { title: 'AI 코드 리뷰', state: 'waiting' },
    ]
  }

  return plan.steps.map((step, index) => ({
    title: step.title,
    state: index === 0 ? 'current' : 'waiting',
  }))
}

function resolveWorkspaceMission(
  selectedMissionId: string,
  generatedPlan: GeneratedCurriculumPlan,
): WorkspaceMission {
  if (selectedMissionId === generatedMissionId) {
    return {
      id: generatedMissionId,
      title: generatedPlan.todayMission.title,
      detail: generatedPlan.todayMission.detail,
      durationMinutes: generatedPlan.todayMission.durationMinutes,
      fileName: generatedPlan.todayMission.fileName,
      trackTitle: generatedPlan.focusRole,
      stepLabel: 'AI 추천 미션',
      sourceLabel: 'AI 커리큘럼 기반',
      guideTitle: generatedPlan.steps[0]?.title ?? generatedPlan.title,
      guideDetail: generatedPlan.steps[0]?.detail ?? generatedPlan.summary,
      practiceDetail: generatedPlan.todayMission.detail,
      hint: generatedPlan.steps[0]?.outcome ?? '오늘 미션을 실행 결과와 연결해 설명해보세요.',
      criteria: [
        '핵심 개념을 내 말로 설명하기',
        '예제 명령 또는 코드를 직접 실행하기',
        '막힌 지점과 다음 질문을 기록하기',
      ],
      sources: generatedPlan.sources.map((source) => `${source.title} · ${source.urlLabel}`),
      codeLines: pickCodeLines(generatedPlan.todayMission.fileName),
    }
  }

  const queueItem = todayQueue.find((item) => item.id === selectedMissionId) ?? todayQueue[0]

  return createQueueMission(queueItem)
}

function createQueueMission(item: TodayQueueItem): WorkspaceMission {
  return {
    id: item.id,
    title: item.title,
    detail: item.detail,
    durationMinutes: item.durationMinutes,
    fileName: item.id === 'run-tests' ? 'Counter.test.jsx' : 'Counter.jsx',
    trackTitle: 'React 입문',
    stepLabel: '오늘 학습 큐',
    sourceLabel: item.status === 'optional' ? 'AI 리뷰 기반' : '공식 문서 기반',
    guideTitle: item.title,
    guideDetail: item.detail,
    practiceDetail: '선택한 큐 항목을 완료할 수 있도록 코드와 실행 결과를 함께 확인하세요.',
    hint: '정답을 바로 보기 전에 현재 코드에서 상태가 바뀌는 지점을 먼저 찾아보세요.',
    criteria: ['미션 내용을 한 문장으로 요약', '코드 또는 문서에서 근거 확인', '완료 여부를 실행 결과로 확인'],
    sources: ['React Docs: State: A Component Memory', 'React Docs: Responding to Events'],
    codeLines: fallbackCodeLines,
  }
}

function pickCodeLines(fileName: string) {
  if (fileName.endsWith('.sh')) {
    return shellCodeLines
  }

  if (fileName.endsWith('.py')) {
    return apiCodeLines
  }

  return fallbackCodeLines
}

function createTestCases(mission: WorkspaceMission): TestCase[] {
  const isGeneratedMission = mission.id === generatedMissionId

  if (isGeneratedMission) {
    return [
      { id: 'TC 01', input: 'pwd', expected: '현재 경로 출력', actual: '현재 경로 출력', state: 'passed', runtime: '8ms' },
      { id: 'TC 02', input: 'ls -la', expected: '파일 목록 출력', actual: '파일 목록 출력', state: 'passed', runtime: '11ms' },
      { id: 'TC 03', input: 'ps aux', expected: '프로세스 확인', actual: '실행 대기', state: 'pending', runtime: '-' },
    ]
  }

  return [
    { id: 'TC 01', input: 'initial = 0', expected: '0 표시', actual: '0 표시', state: 'passed', runtime: '12ms' },
    { id: 'TC 02', input: 'click once', expected: '1 표시', actual: '1 표시', state: 'passed', runtime: '14ms' },
    { id: 'TC 03', input: 'click many', expected: '누적 증가', actual: '확인 필요', state: 'failed', runtime: '16ms' },
    { id: 'TC 04', input: 'negative case', expected: '오류 없음', actual: '대기', state: 'pending', runtime: '-' },
  ]
}

export default function LearningWorkspace() {
  const [searchParams] = useSearchParams()
  const { profile } = useLearningProfileStore()
  const profileGoal = profile?.learningGoal ?? defaultCareerGoal
  const selectedMissionId = searchParams.get('mission') ?? generatedMissionId
  const generatedPlan = generateMockCurriculum(profileGoal)
  const mission = resolveWorkspaceMission(selectedMissionId, generatedPlan)
  const curriculumSteps = createSteps(generatedPlan, mission.id)
  const currentStepIndex = Math.max(
    1,
    curriculumSteps.findIndex((step) => step.state === 'current') + 1,
  )
  const progressPercent = Math.round((currentStepIndex / curriculumSteps.length) * 100)
  const testCases = createTestCases(mission)
  const passedCount = testCases.filter((item) => item.state === 'passed').length
  const failedCount = testCases.filter((item) => item.state === 'failed').length

  return (
    <section className={styles.page} aria-labelledby="workspace-title">
      <header className={styles.topbar}>
        <div className={styles.trackSummary}>
          <span className={styles.kicker}>학습 워크스페이스</span>
          <h1 id="workspace-title">{mission.title}</h1>
          <p>{mission.trackTitle} · {mission.stepLabel}</p>
        </div>
        <nav className={styles.actions} aria-label="학습 화면 이동">
          <Link to="/today" className={styles.secondaryButton}>오늘 학습</Link>
          <Link to="/today#tracks-title" className={styles.secondaryButton}>학습 목록</Link>
        </nav>
      </header>

      <section className={styles.statusStrip} aria-label="학습 상태 요약">
        <article>
          <span>진행률</span>
          <strong>{progressPercent}%</strong>
          <div><i style={{ width: `${progressPercent}%` }} /></div>
        </article>
        <article>
          <span>테스트</span>
          <strong>{passedCount} / {testCases.length}</strong>
          <small>현재 통과</small>
        </article>
        <article>
          <span>예상 시간</span>
          <strong>{mission.durationMinutes}분</strong>
          <small>오늘 미션</small>
        </article>
        <article>
          <span>코드 품질</span>
          <strong>{failedCount > 0 ? 'B+' : 'A'}</strong>
          <small>{failedCount > 0 ? '개선 필요' : '우수'}</small>
        </article>
      </section>

      <div className={styles.workspaceGrid}>
        <aside className={styles.curriculumPanel} aria-label="오늘 커리큘럼">
          <section className={styles.railCard}>
            <div className={styles.railTitleRow}>
              <h2>현재 단계</h2>
              <span>{currentStepIndex} / {curriculumSteps.length}</span>
            </div>
            <div className={styles.currentStepCard}>
              <strong>{mission.title}</strong>
              <p>{mission.fileName}</p>
              <div><i style={{ width: `${progressPercent}%` }} /></div>
            </div>
          </section>

          <section className={styles.railCard}>
            <div className={styles.railTitleRow}>
              <h2>커리큘럼</h2>
              <span>{stateLabel(curriculumSteps[currentStepIndex - 1]?.state ?? 'current')}</span>
            </div>
            <ol className={styles.stepList}>
              {curriculumSteps.map((step, index) => (
                <li className={styles.stepItem} data-state={step.state} key={step.title}>
                  <span className={styles.stepIndex}>{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <small>{stateLabel(step.state)}</small>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className={styles.railCard}>
            <div className={styles.railTitleRow}>
              <h2>학습 보조</h2>
            </div>
            <div className={styles.supportList}>
              <button type="button">코드 스니펫</button>
              <button type="button">개념 요약 노트</button>
              <button type="button">퀴즈 모드</button>
            </div>
          </section>
        </aside>

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

          <article className={styles.sources}>
            <span className={styles.sectionLabel}>공식 문서 참고</span>
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

        <section className={styles.editorPanel} aria-label="코드 에디터">
          <div className={styles.editorToolbar}>
            <div className={styles.editorTab}>{mission.fileName}</div>
            <div className={styles.editorActions}>
              <span className={styles.languageBadge}>{mission.stepLabel}</span>
              <button type="button" className={styles.runButton}>실행</button>
            </div>
          </div>
          <pre className={styles.codeBlock} aria-label={`${mission.fileName} 코드`}>
            {mission.codeLines.map((line, index) => (
              <code key={`${index}-${line}`}>
                <span>{index + 1}</span>
                {line || ' '}
              </code>
            ))}
          </pre>
        </section>
      </div>

      <section className={styles.resultPanel} aria-label="실행 결과">
        <div className={styles.resultMain}>
          <div className={styles.resultHeader}>
            <div>
              <h2>테스트 결과</h2>
              <p>{passedCount} / {testCases.length} 테스트 통과</p>
            </div>
            <div className={styles.resultBadges}>
              <span data-state="passed">통과 {passedCount}</span>
              <span data-state="failed">실패 {failedCount}</span>
              <span data-state="pending">대기 {testCases.length - passedCount - failedCount}</span>
            </div>
          </div>

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
                <span role="cell" data-state={testCase.state}>{testStateLabel(testCase.state)}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className={styles.helpPanel} aria-label="도움말과 활동 기록">
          <section>
            <h3>도움이 필요한가요?</h3>
            <button type="button">힌트 요청</button>
            <button type="button">코드 리뷰 요청</button>
          </section>
          <section>
            <h3>활동 기록</h3>
            <ol>
              {activityItems.map((item) => (
                <li key={`${item.time}-${item.title}`}>
                  <time>{item.time}</time>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </section>
    </section>
  )
}
