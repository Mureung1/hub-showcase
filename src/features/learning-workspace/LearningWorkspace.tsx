import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { createFallbackCurriculumPlan } from '../../data/curriculumClient'
import { type GeneratedCurriculumPlan } from '../../data/curriculumGenerator'
import { todayQueue, type TodayQueueItem } from '../../data/todayLearning'
import { useLearningProfileStore } from '../../stores/useLearningProfileStore'
import {
  resolveGeneratedCurriculumPlan,
  useGeneratedCurriculumStore,
} from '../../stores/useGeneratedCurriculumStore'
import {
  useLearningProgressStore,
  type LearningActivityItem,
} from '../../stores/useLearningProgressStore'
import styles from './LearningWorkspace.module.css'
import {
  createStepState,
  createWorkspaceTestCases,
  generatedMissionId,
  getInitialStepOffset,
  getNextRunState,
  getResultMessage,
  type RunState,
  type StepState,
  type TestCase,
  type TestState,
} from './workspaceInteraction'


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



type LearningWorkspaceViewProps = {
  generatedPlan: GeneratedCurriculumPlan
  mission: WorkspaceMission
}

const defaultCareerGoal = 'DEVOPS 엔지니어가 되고 싶어'

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

const initialActivityItems: LearningActivityItem[] = [
  { id: 'submit-ready', time: '10:15', title: '코드 제출', detail: '현재 미션 제출 준비' },
  { id: 'hint-opened', time: '10:12', title: '힌트 확인', detail: '상태 변경 흐름 확인' },
  { id: 'run-started', time: '10:08', title: '코드 실행', detail: '테스트 케이스 실행' },
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

function createSteps(
  plan: GeneratedCurriculumPlan,
  selectedMissionId: string,
  activeStepOffset: number,
): CurriculumStep[] {
  if (selectedMissionId !== generatedMissionId) {
    return ['개념 확인', '현재 미션', '테스트 실행', 'AI 코드 리뷰'].map((title, index) => ({
      title,
      state: createStepState(index, activeStepOffset),
    }))
  }

  return plan.steps.map((step, index) => ({
    title: step.title,
    state: createStepState(index, activeStepOffset),
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

function createTestCases(mission: WorkspaceMission, runState: RunState): TestCase[] {
  return createWorkspaceTestCases({
    isGeneratedMission: mission.id === generatedMissionId,
    runState,
  })
}

function getLogTime() {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
}

export default function LearningWorkspace() {
  const [searchParams] = useSearchParams()
  const { profile } = useLearningProfileStore()
  const generatedCurriculum = useGeneratedCurriculumStore((state) => state.generatedCurriculum)
  const profileGoal = profile?.learningGoal ?? defaultCareerGoal
  const selectedMissionId = searchParams.get('mission') ?? generatedMissionId
  const fallbackGeneratedPlan = useMemo(() => createFallbackCurriculumPlan(profileGoal), [profileGoal])
  const generatedPlan = useMemo(
    () => resolveGeneratedCurriculumPlan(generatedCurriculum, fallbackGeneratedPlan),
    [fallbackGeneratedPlan, generatedCurriculum],
  )
  const planKey = generatedCurriculum?.generatedAt ?? profileGoal
  const mission = useMemo(
    () => resolveWorkspaceMission(selectedMissionId, generatedPlan),
    [generatedPlan, selectedMissionId],
  )

  return (
    <LearningWorkspaceView
      key={`${mission.id}-${planKey}`}
      generatedPlan={generatedPlan}
      mission={mission}
    />
  )
}
function LearningWorkspaceView({ generatedPlan, mission }: LearningWorkspaceViewProps) {
  const savedProgress = useLearningProgressStore((state) => state.missions[mission.id])
  const recordRunResult = useLearningProgressStore((state) => state.recordRunResult)
  const recordMissionActivity = useLearningProgressStore((state) => state.recordMissionActivity)
  const advanceMissionStep = useLearningProgressStore((state) => state.advanceMissionStep)
  const [runState, setRunState] = useState<RunState>(savedProgress?.runState ?? 'idle')
  const [runAttemptCount, setRunAttemptCount] = useState(savedProgress?.runAttemptCount ?? 0)
  const [hintVisible, setHintVisible] = useState(false)
  const [reviewVisible, setReviewVisible] = useState(false)
  const [activeStepOffset, setActiveStepOffset] = useState(() =>
    savedProgress?.activeStepOffset ?? getInitialStepOffset(mission.id),
  )
  const [activityLog, setActivityLog] = useState<LearningActivityItem[]>(
    savedProgress?.activityLog.length ? savedProgress.activityLog : initialActivityItems,
  )
  const runTimerRef = useRef<number | undefined>(undefined)
  const curriculumSteps = useMemo(
    () => createSteps(generatedPlan, mission.id, activeStepOffset),
    [activeStepOffset, generatedPlan, mission.id],
  )
  const currentStepIndex = Math.max(
    1,
    curriculumSteps.findIndex((step) => step.state === 'current') + 1,
  )
  const progressPercent = Math.round((currentStepIndex / curriculumSteps.length) * 100)
  const testCases = useMemo(() => createTestCases(mission, runState), [mission, runState])
  const passedCount = testCases.filter((item) => item.state === 'passed').length
  const failedCount = testCases.filter((item) => item.state === 'failed').length
  const pendingCount = testCases.length - passedCount - failedCount
  const canAdvance = runState === 'passed'
  const resultMessage = getResultMessage(runState, passedCount, failedCount, testCases.length)

  useEffect(() => {
    return () => {
      if (runTimerRef.current) {
        window.clearTimeout(runTimerRef.current)
      }
    }
  }, [])

  function createActivity(title: string, detail: string) {
    return {
      id: `${Date.now()}-${title}`,
      time: getLogTime(),
      title,
      detail,
    }
  }

  function prependActivity(items: LearningActivityItem[], item: LearningActivityItem) {
    return [item, ...items].slice(0, 5)
  }

  function addActivity(title: string, detail: string) {
    const nextLog = prependActivity(activityLog, createActivity(title, detail))
    setActivityLog(nextLog)

    return nextLog
  }

  function handleRun() {
    if (runTimerRef.current) {
      window.clearTimeout(runTimerRef.current)
    }

    setRunState('running')
    setReviewVisible(false)
    const runLog = addActivity('코드 실행', `${mission.fileName} 테스트를 실행했습니다.`)

    runTimerRef.current = window.setTimeout(() => {
      const nextState = getNextRunState(runAttemptCount)
      const nextAttemptCount = runAttemptCount + 1
      const resultLog = prependActivity(
        runLog,
        createActivity(
          nextState === 'passed' ? '테스트 통과' : '테스트 실패',
          nextState === 'passed'
            ? '모든 테스트가 통과했습니다. 다음 단계로 이동할 수 있습니다.'
            : '실패 케이스를 확인하고 힌트를 열어보세요.',
        ),
      )

      setRunState(nextState)
      setRunAttemptCount(nextAttemptCount)
      setActivityLog(resultLog)
      recordRunResult({
        missionId: mission.id,
        runState: nextState,
        runAttemptCount: nextAttemptCount,
        activeStepOffset,
        activityLog: resultLog,
      })
    }, 520)
  }
  function handleShowHint() {
    setHintVisible(true)
    const nextLog = addActivity('힌트 확인', '현재 미션의 접근 방향을 확인했습니다.')
    recordMissionActivity({
      missionId: mission.id,
      activeStepOffset,
      activityLog: nextLog,
    })
  }

  function handleShowReview() {
    setReviewVisible(true)
    const nextLog = addActivity(
      '코드 리뷰 요청',
      runState === 'passed' ? '통과한 코드의 개선점을 확인했습니다.' : '리뷰 전에 실패 케이스 확인이 필요합니다.',
    )
    recordMissionActivity({
      missionId: mission.id,
      activeStepOffset,
      activityLog: nextLog,
    })
  }

  function handleAdvanceStep() {
    if (!canAdvance) {
      return
    }

    const nextStepOffset = Math.min(activeStepOffset + 1, curriculumSteps.length - 1)
    const nextLog = addActivity('다음 단계', '현재 미션을 완료하고 다음 학습 단계로 이동했습니다.')
    setActiveStepOffset(nextStepOffset)
    setRunState('idle')
    setRunAttemptCount(0)
    setReviewVisible(false)
    setHintVisible(false)
    advanceMissionStep({
      missionId: mission.id,
      activeStepOffset: nextStepOffset,
      activityLog: nextLog,
    })
  }

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
          <small>{runState === 'running' ? '실행 중' : '현재 통과'}</small>
        </article>
        <article>
          <span>예상 시간</span>
          <strong>{mission.durationMinutes}분</strong>
          <small>오늘 미션</small>
        </article>
        <article>
          <span>코드 품질</span>
          <strong>{failedCount > 0 ? 'B+' : 'A'}</strong>
          <small>{runState === 'running' ? '채점 중' : failedCount > 0 ? '개선 필요' : '우수'}</small>
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

          {hintVisible ? (
            <article className={styles.hintCard} aria-live="polite">
              <span className={styles.sectionLabel}>힌트</span>
              <h3>먼저 바뀌는 값을 찾으세요</h3>
              <p>{mission.hint}</p>
            </article>
          ) : null}

          {reviewVisible ? (
            <article className={styles.reviewNoteCard} aria-live="polite">
              <span className={styles.sectionLabel}>코드 리뷰</span>
              <h3>{runState === 'passed' ? '좋은 흐름입니다' : '아직 확인할 실패 케이스가 있습니다'}</h3>
              <p>
                {runState === 'passed'
                  ? '핵심 요구사항을 만족했습니다. 다음에는 상태 변경 이유를 짧게 주석이나 설명으로 정리해보세요.'
                  : '실패한 케이스의 실제 결과를 먼저 보고, 어떤 값이 예상과 달라졌는지 표시한 뒤 다시 실행하세요.'}
              </p>
            </article>
          ) : null}

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
              <button
                type="button"
                className={styles.runButton}
                disabled={runState === 'running'}
                onClick={handleRun}
              >
                {runState === 'running' ? '실행 중' : runState === 'failed' ? '다시 실행' : '실행'}
              </button>
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
              <p>{resultMessage}</p>
            </div>
            <div className={styles.resultBadges}>
              <span data-state="passed">통과 {passedCount}</span>
              <span data-state="failed">실패 {failedCount}</span>
              <span data-state="pending">대기 {pendingCount}</span>
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
            <button type="button" onClick={handleShowHint}>힌트 요청</button>
            <button type="button" onClick={handleShowReview}>코드 리뷰 요청</button>
            <button
              type="button"
              className={styles.nextStepButton}
              disabled={!canAdvance}
              onClick={handleAdvanceStep}
            >
              다음 단계
            </button>
          </section>
          <section>
            <h3>활동 기록</h3>
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
          </section>
        </aside>
      </section>
    </section>
  )
}

