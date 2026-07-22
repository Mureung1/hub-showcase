import Editor from '@monaco-editor/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { shouldUseServerApi } from '../../app/icuApiMode'
import { createFallbackCurriculumPlan } from '../curriculum/api/curriculumClient'
import { type GeneratedCurriculumPlan, type GeneratedCurriculumStep } from '../curriculum/model/curriculumGenerator'
import {
  resolveGeneratedCurriculumPlan,
  useGeneratedCurriculumStore,
} from '../curriculum/model/useGeneratedCurriculumStore'
import { saveMissionProgress } from '../learning-progress/api/learningProgressClient'
import { executeCode } from './api/codeRunnerClient'
import {
  useLearningProgressStore,
  type LearningActivityItem,
  type LearningRunState,
} from '../learning-progress/model/useLearningProgressStore'
import { useLearningProfileStore } from '../profile/model/useLearningProfileStore'
import { todayQueue, type TodayQueueItem } from '../today-learning/data/todayLearning'
import styles from './LearningWorkspace.module.css'
import {
  clampStepOffset,
  createStepState,
  createWorkspaceTestCases,
  generatedMissionId,
  getInitialStepOffset,
  getNextRunState,
  getResultMessage,
  isFinalStep,
  type RunState,
  type StepState,
  type TestCase,
  type TestState,
} from './workspaceInteraction'

type CurriculumStep = {
  title: string
  detail: string
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
  hasSavedGeneratedPlan: boolean
  mission: WorkspaceMission
}

type CodeRunPreviewState = {
  status: RunState
  logs: string[]
  error?: string
  result?: string | null
}

type RenderPreviewModel = {
  canRender: boolean
  title: string
  buttonLabel: string
  componentName: string
}

type WorkspaceEditorFile = {
  path: string
  name: string
  language: string
  value: string
}

const defaultCareerGoal = 'DevOps 엔지니어가 되고 싶어'

const reactCodeLines = [
  "import React, { useState } from 'react'",
  '',
  'export default function Counter({ initial = 0 }) {',
  '  const [count, setCount] = useState(initial)',
  '',
  '  return (',
  '    <section aria-label="counter practice">',
  '      <p>{count}</p>',
  '      <button onClick={() => setCount(count + 1)}>+1</button>',
  '    </section>',
  '  )',
  '}',
]

const shellCodeLines = [
  '#!/bin/bash',
  'echo "현재 위치 확인"',
  'pwd',
  '',
  'echo "학습 파일 목록 확인"',
  'ls -la',
  '',
  'echo "실행 중인 프로세스 일부 확인"',
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

const dockerCodeLines = [
  'FROM node:22-alpine',
  'WORKDIR /app',
  'COPY package*.json ./',
  'RUN npm ci',
  'COPY . .',
  'CMD ["npm", "run", "dev"]',
]

const initialActivityItems: LearningActivityItem[] = [
  { id: 'submit-ready', time: '10:15', title: '학습 준비', detail: '오늘 미션과 참고 문서를 확인했습니다.' },
  { id: 'hint-opened', time: '10:12', title: '힌트 확인', detail: '막히는 지점을 먼저 좁혀봅니다.' },
  { id: 'run-started', time: '10:08', title: '테스트 실행', detail: '현재 코드 상태를 확인했습니다.' },
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
      detail: '선택한 오늘 학습 항목을 완료하기 위한 기본 단계입니다.',
      state: createStepState(index, activeStepOffset),
    }))
  }

  return plan.steps.map((step, index) => ({
    title: step.title,
    detail: step.detail,
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
      trackTitle: generatedPlan.focusRole || generatedPlan.title,
      stepLabel: 'AI 추천 미션',
      sourceLabel: '생성 커리큘럼 기반',
      guideTitle: generatedPlan.steps[0]?.title ?? generatedPlan.title,
      guideDetail: generatedPlan.steps[0]?.detail ?? generatedPlan.summary,
      practiceDetail: generatedPlan.todayMission.detail,
      hint: generatedPlan.steps[0]?.outcome ?? '오늘 미션을 실행한 뒤 결과와 헷갈린 지점을 짧게 기록해보세요.',
      criteria: [
        '오늘 단계의 핵심을 한 문장으로 설명하기',
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
    stepLabel: '오늘 학습 항목',
    sourceLabel: item.status === 'optional' ? 'AI 리뷰 기반' : '공식 문서 기반',
    guideTitle: item.title,
    guideDetail: item.detail,
    practiceDetail: '선택한 항목을 완료할 수 있도록 코드와 실행 결과를 함께 확인하세요.',
    hint: '정답을 바로 보기 전에 현재 코드에서 상태가 바뀌는 지점을 먼저 찾아보세요.',
    criteria: ['미션 내용을 한 문장으로 요약', '코드 또는 문서에서 근거 확인', '완료 여부를 실행 결과로 확인'],
    sources: ['React Docs: State: A Component Memory', 'React Docs: Responding to Events'],
    codeLines: reactCodeLines,
  }
}

function getEditorLanguage(fileName: string) {
  const ext = fileName.toLowerCase()
  if (ext.endsWith('.py')) return 'python'
  if (ext.endsWith('.jsx') || ext.endsWith('.tsx')) return 'javascript'
  if (ext.endsWith('.css')) return 'css'
  if (ext.endsWith('.md')) return 'markdown'
  if (ext.endsWith('.sh')) return 'shell'
  if (ext.includes('dockerfile')) return 'dockerfile'
  return 'javascript'
}

function getExecutionLanguage(fileName: string) {
  const ext = fileName.toLowerCase()
  if (ext.endsWith('.py')) return 'python'
  if (ext.endsWith('.jsx') || ext.endsWith('.tsx')) return 'jsx'
  if (ext.endsWith('.sh')) return 'shell'
  if (ext.includes('dockerfile')) return 'dockerfile'
  return 'javascript'
}

function pickCodeLines(fileName: string) {
  const normalizedFileName = fileName.toLowerCase()

  if (normalizedFileName.endsWith('.sh')) {
    return shellCodeLines
  }

  if (normalizedFileName.endsWith('.py')) {
    return apiCodeLines
  }

  if (normalizedFileName.includes('dockerfile') || normalizedFileName.endsWith('.dockerfile')) {
    return dockerCodeLines
  }

  return reactCodeLines
}

function createWorkspaceEditorFiles(mission: WorkspaceMission): WorkspaceEditorFile[] {
  const fileName = mission.fileName
  const appCode = mission.codeLines.join('\n')
  const files: WorkspaceEditorFile[] = [
    {
      path: `file:///${mission.id}/${fileName}`,
      name: fileName,
      language: getEditorLanguage(fileName),
      value: appCode,
    },
  ]

  if (/\.(jsx?|tsx?)$/i.test(fileName)) {
    files.push({
      path: `file:///${mission.id}/styles.css`,
      name: 'styles.css',
      language: 'css',
      value: [
        '.preview-root {',
        '  display: grid;',
        '  gap: 16px;',
        '}',
        '',
        'button {',
        '  font: inherit;',
        '}',
      ].join('\n'),
    })
  }

  files.push({
    path: `file:///${mission.id}/mission-notes.md`,
    name: 'mission-notes.md',
    language: 'markdown',
    value: `# ${mission.title}\n\n- 실행 결과를 확인합니다.\n- 막힌 지점과 다음 질문을 기록합니다.`,
  })

  return files
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

function resolveActiveGeneratedStep(
  generatedPlan: GeneratedCurriculumPlan,
  activeStepOffset: number,
): GeneratedCurriculumStep | null {
  if (generatedPlan.steps.length === 0) {
    return null
  }

  return generatedPlan.steps[clampStepOffset(activeStepOffset, generatedPlan.steps.length)] ?? null
}

function createActiveMissionPresentation(
  mission: WorkspaceMission,
  activeGeneratedStep: GeneratedCurriculumStep | null,
): WorkspaceMission {
  if (!activeGeneratedStep || mission.id !== generatedMissionId) {
    return mission
  }

  return {
    ...mission,
    title: activeGeneratedStep.title,
    detail: activeGeneratedStep.detail,
    guideTitle: activeGeneratedStep.title,
    guideDetail: activeGeneratedStep.detail,
    practiceDetail: `${activeGeneratedStep.title}을 실습하면서 ${mission.fileName} 파일에서 확인할 내용을 정리하세요.`,
    hint: activeGeneratedStep.outcome || mission.hint,
  }
}

function stripJsxText(value: string | undefined) {
  return (value ?? '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractJsxText(code: string, tagName: string) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i')
  return stripJsxText(pattern.exec(code)?.[1])
}

function createRenderPreviewModel(code: string, fileName: string): RenderPreviewModel {
  const language = fileName.toLowerCase()
  const canRender = language.endsWith('.js') || language.endsWith('.jsx') || language.endsWith('.tsx')

  if (!canRender) {
    return {
      canRender: false,
      title: 'Preview unavailable',
      buttonLabel: '',
      componentName: fileName,
    }
  }

  const title = extractJsxText(code, 'h1') || extractJsxText(code, 'h2') || 'Welcome to my app'
  const buttonLabel = extractJsxText(code, 'button') || '+1'
  const componentName = /function\s+([A-Z][A-Za-z0-9_]*)/.exec(code)?.[1] ?? 'App'

  return { canRender, title, buttonLabel, componentName }
}

function getIframeSrcDoc(code: string, componentName: string = 'App') {
  const cleanCode = code
    .replace(/import\s+(?:React,\s*)?{([^}]+)}\s+from\s+['"]react['"]/g, 'const { $1 } = window.React;')
    .replace(/import\s+React\s+from\s+['"]react['"]/g, '')
    .replace(/import\s+.*?\s+from\s+['"].*?['"]/g, '')
    .replace(/export\s+default\s+/g, '')
    .replace(/export\s+/g, '')

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; margin: 16px; background: transparent; color: #030712; }
    button { background: #007aff; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; }
    button:hover { background: #006ae6; }
  </style>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react">
    try {
      ${cleanCode}

      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(${componentName}));
    } catch (err) {
      document.getElementById('root').innerHTML = '<div style="color:red;white-space:pre-wrap;font-family:monospace;">' + err.message + '</div>';
    }
  </script>
</body>
</html>
  `
}

function createInitialRunPreviewState(): CodeRunPreviewState {
  return { status: 'idle', logs: [] }
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
      hasSavedGeneratedPlan={Boolean(generatedCurriculum)}
      mission={mission}
    />
  )
}

function LearningWorkspaceView({ generatedPlan, hasSavedGeneratedPlan, mission }: LearningWorkspaceViewProps) {
  const savedProgress = useLearningProgressStore((state) => state.missions[mission.id])
  const recordRunResult = useLearningProgressStore((state) => state.recordRunResult)
  const recordMissionActivity = useLearningProgressStore((state) => state.recordMissionActivity)
  const advanceMissionStep = useLearningProgressStore((state) => state.advanceMissionStep)
  const upsertMissionProgress = useLearningProgressStore((state) => state.upsertMissionProgress)
  const [runState, setRunState] = useState<RunState>(savedProgress?.runState ?? 'idle')
  const [runAttemptCount, setRunAttemptCount] = useState(savedProgress?.runAttemptCount ?? 0)
  const [hintVisible, setHintVisible] = useState(false)
  const [reviewVisible, setReviewVisible] = useState(false)
  const [missionCompleted, setMissionCompleted] = useState(() => {
    const initialStepOffset = savedProgress?.activeStepOffset ?? getInitialStepOffset(mission.id)
    const initialTotalSteps = Math.max(
      mission.id === generatedMissionId ? generatedPlan.steps.length : 4,
      1,
    )

    return Boolean(savedProgress?.completedAt && isFinalStep(initialStepOffset, initialTotalSteps))
  })
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
  const totalSteps = Math.max(curriculumSteps.length, 1)
  const currentStepIndex = Math.max(
    1,
    curriculumSteps.findIndex((step) => step.state === 'current') + 1,
  )
  const finalStep = isFinalStep(activeStepOffset, totalSteps)
  const progressPercent = missionCompleted ? 100 : Math.round((currentStepIndex / totalSteps) * 100)
  const activeGeneratedStep = useMemo(
    () => resolveActiveGeneratedStep(generatedPlan, activeStepOffset),
    [activeStepOffset, generatedPlan],
  )
  const activeMission = useMemo(
    () => createActiveMissionPresentation(mission, activeGeneratedStep),
    [activeGeneratedStep, mission],
  )
  const testCases = useMemo(() => createTestCases(mission, runState), [mission, runState])
  const passedCount = testCases.filter((item) => item.state === 'passed').length
  const failedCount = testCases.filter((item) => item.state === 'failed').length
  const pendingCount = testCases.length - passedCount - failedCount
  const canAdvance = runState === 'passed' && !missionCompleted
  const resultMessage = missionCompleted
    ? '오늘 미션을 완료했습니다. Today Hub에서 다음 학습을 확인하세요.'
    : getResultMessage(runState, passedCount, failedCount, testCases.length)
  const nextStepButtonLabel = missionCompleted ? '완료됨' : finalStep ? '오늘 미션 완료' : '다음 단계'
  const planSummaryItems = [
    { label: '학습 목표', value: generatedPlan.goal },
    { label: '추천 트랙', value: generatedPlan.focusRole || generatedPlan.title },
    { label: '예상 기간', value: generatedPlan.estimatedDuration },
  ]

  const [editorFiles, setEditorFiles] = useState<WorkspaceEditorFile[]>(() => createWorkspaceEditorFiles(activeMission))
  const [activeFilePath, setActiveFilePath] = useState(() => createWorkspaceEditorFiles(activeMission)[0]?.path ?? '')
  const [runPreview, setRunPreview] = useState<CodeRunPreviewState>(() => createInitialRunPreviewState())

  useEffect(() => {
    const nextFiles = createWorkspaceEditorFiles(activeMission)
    setEditorFiles(nextFiles)
    setActiveFilePath(nextFiles[0]?.path ?? '')
    setRunPreview(createInitialRunPreviewState())
    setPreviewCode(nextFiles.find((file) => /\.(jsx?|tsx?)$/i.test(file.name))?.value ?? nextFiles[0]?.value ?? '')
  }, [activeMission])

  const activeFile = editorFiles.find((file) => file.path === activeFilePath) ?? editorFiles[0]
  const runnableFile = editorFiles.find((file) => /\.(jsx?|tsx?)$/i.test(file.name)) ?? activeFile
  const code = activeFile?.value ?? ''
  const runnableCode = runnableFile?.value ?? code
  const [previewCode, setPreviewCode] = useState(runnableCode)

  function updateActiveFile(value: string) {
    if (!activeFile) {
      return
    }

    setEditorFiles((currentFiles) =>
      currentFiles.map((file) => (file.path === activeFile.path ? { ...file, value } : file)),
    )
  }

  function resetActiveFile() {
    if (!activeFile) {
      return
    }

    const initialFile = createWorkspaceEditorFiles(activeMission).find((file) => file.path === activeFile.path)
    if (!initialFile) {
      return
    }

    setEditorFiles((currentFiles) =>
      currentFiles.map((file) => (file.path === activeFile.path ? { ...file, value: initialFile.value } : file)),
    )
  }

  const renderPreview = useMemo(
    () => createRenderPreviewModel(previewCode, runnableFile?.name ?? activeMission.fileName),
    [activeMission.fileName, previewCode, runnableFile?.name],
  )

  const consoleLines = runPreview.logs.length > 0
    ? runPreview.logs
    : runPreview.status === 'idle'
      ? ['실행하면 console.log 출력이 여기에 표시됩니다.']
      : ['출력 없이 실행이 끝났습니다.']


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

  function getServerRunState(state: RunState): LearningRunState {
    return state === 'running' ? 'idle' : state
  }

  function recordServerSyncFailure(missionId: string, stepOffset: number) {
    setActivityLog((currentLog) => {
      const nextLog = prependActivity(
        currentLog,
        createActivity('서버 동기화 실패', '로컬 진행 기록은 저장했습니다. 백엔드를 실행한 뒤 다시 시도하세요.'),
      )
      recordMissionActivity({ missionId, activeStepOffset: stepOffset, activityLog: nextLog })

      return nextLog
    })
  }

  function syncMissionProgressToServer(input: {
    missionId: string
    runState: LearningRunState
    runAttemptCount: number
    activeStepOffset: number
    completedAt?: string | null
    activityLog: LearningActivityItem[]
  }) {
    if (!shouldUseServerApi()) {
      return
    }

    void saveMissionProgress(input.missionId, {
      runState: input.runState,
      runAttemptCount: input.runAttemptCount,
      activeStepOffset: input.activeStepOffset,
      completedAt: input.completedAt,
      activityLog: input.activityLog,
    })
      .then(({ progress }) => upsertMissionProgress(progress))
      .catch(() => recordServerSyncFailure(input.missionId, input.activeStepOffset))
  }

  async function handleRun() {
    if (runTimerRef.current) {
      window.clearTimeout(runTimerRef.current)
    }

    setRunState('running')
    setPreviewCode(runnableCode)
    setRunPreview({ status: 'running', logs: ['코드를 실행하고 있습니다...'] })
    setMissionCompleted(false)
    setReviewVisible(false)
    const runLog = addActivity('테스트 실행', `${activeMission.fileName} 기준으로 백엔드에 코드를 전송하여 실행합니다.`)

    try {
      const language = getExecutionLanguage(runnableFile?.name ?? activeMission.fileName)
      const res = await executeCode(runnableCode, language)
      const nextState = res.success ? 'passed' : 'failed'
      const detailMsg = res.success
        ? `실행이 성공했습니다. (출력: ${res.logs.length}줄)`
        : `실행 실패: ${res.error || '오류 발생'}`

      const nextAttemptCount = runAttemptCount + 1
      const resultLog = prependActivity(
        runLog,
        createActivity(
          nextState === 'passed' ? '테스트 통과' : '테스트 실패',
          detailMsg
        ),
      )

      setRunState(nextState)
      setRunPreview({
        status: nextState,
        logs: res.logs,
        error: res.error,
        result: res.result,
      })
      setRunAttemptCount(nextAttemptCount)
      setActivityLog(resultLog)

      recordRunResult({
        missionId: mission.id,
        runState: nextState,
        runAttemptCount: nextAttemptCount,
        activeStepOffset,
        activityLog: resultLog,
      })
      syncMissionProgressToServer({
        missionId: mission.id,
        runState: nextState,
        runAttemptCount: nextAttemptCount,
        activeStepOffset,
        activityLog: resultLog,
      })
    } catch (e) {
      setRunState('failed')
      setRunPreview({
        status: 'failed',
        logs: [],
        error: e instanceof Error ? e.message : '코드 실행에 실패했습니다.',
      })
      const resultLog = prependActivity(runLog, createActivity('테스트 실패', '서버 또는 네트워크 오류로 코드 실행에 실패했습니다.'))
      setActivityLog(resultLog)
    }
  }

  function handleShowHint() {
    setHintVisible(true)
    const nextLog = addActivity('힌트 확인', `${activeMission.title} 단계의 접근 방향을 확인했습니다.`)
    recordMissionActivity({
      missionId: mission.id,
      activeStepOffset,
      activityLog: nextLog,
    })
    syncMissionProgressToServer({
      missionId: mission.id,
      runState: getServerRunState(runState),
      runAttemptCount,
      activeStepOffset,
      activityLog: nextLog,
    })
  }

  function handleShowReview() {
    setReviewVisible(true)
    const nextLog = addActivity(
      '코드 리뷰 요청',
      runState === 'passed' ? '통과한 코드의 개선점을 확인했습니다.' : '리뷰 전에 실패 항목을 먼저 확인합니다.',
    )
    recordMissionActivity({
      missionId: mission.id,
      activeStepOffset,
      activityLog: nextLog,
    })
    syncMissionProgressToServer({
      missionId: mission.id,
      runState: getServerRunState(runState),
      runAttemptCount,
      activeStepOffset,
      activityLog: nextLog,
    })
  }

  function handleAdvanceStep() {
    if (!canAdvance) {
      return
    }

    if (finalStep) {
      const completedAt = new Date().toISOString()
      const nextLog = addActivity('오늘 미션 완료', '생성 커리큘럼의 오늘 학습 단계를 모두 마쳤습니다.')
      setMissionCompleted(true)
      setHintVisible(false)
      setReviewVisible(false)
      recordRunResult({
        missionId: mission.id,
        runState: 'passed',
        runAttemptCount,
        activeStepOffset,
        completedAt,
        activityLog: nextLog,
      })
      syncMissionProgressToServer({
        missionId: mission.id,
        runState: 'passed',
        runAttemptCount,
        activeStepOffset,
        completedAt,
        activityLog: nextLog,
      })
      return
    }

    const nextStepOffset = Math.min(activeStepOffset + 1, totalSteps - 1)
    const nextLog = addActivity('다음 단계', '현재 단계를 완료하고 다음 학습 단계로 이동했습니다.')
    setActiveStepOffset(nextStepOffset)
    setRunState('idle')
    setRunAttemptCount(0)
    setHintVisible(false)
    setReviewVisible(false)
    advanceMissionStep({
      missionId: mission.id,
      activeStepOffset: nextStepOffset,
      activityLog: nextLog,
    })
    syncMissionProgressToServer({
      missionId: mission.id,
      runState: 'idle',
      runAttemptCount: 0,
      activeStepOffset: nextStepOffset,
      activityLog: nextLog,
    })
  }

  return (
    <section className={styles.page} aria-labelledby="workspace-title">
      <header className={styles.topbar}>
        <div className={styles.trackSummary}>
          <span className={styles.kicker}>Learning Workspace</span>
          <h1 id="workspace-title">{activeMission.title}</h1>
          <p>{activeMission.trackTitle} · {activeMission.stepLabel}</p>
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
          <strong>{activeMission.durationMinutes}분</strong>
          <small>오늘 미션</small>
        </article>
        <article>
          <span>학습 상태</span>
          <strong>{missionCompleted ? '완료' : failedCount > 0 ? '점검' : '준비'}</strong>
          <small>{runState === 'running' ? '채점 중' : missionCompleted ? '마침' : failedCount > 0 ? '개선 필요' : '시작 가능'}</small>
        </article>
      </section>

      <div className={styles.workspaceGrid}>
        <aside className={styles.curriculumPanel} aria-label="오늘 커리큘럼">
          <section className={styles.railCard}>
            <div className={styles.railTitleRow}>
              <h2>현재 단계</h2>
              <span>{currentStepIndex} / {totalSteps}</span>
            </div>
            <div className={styles.currentStepCard}>
              <strong>{activeMission.title}</strong>
              <p>{activeMission.fileName}</p>
              <small>{curriculumSteps[currentStepIndex - 1]?.detail}</small>
              <div><i style={{ width: `${progressPercent}%` }} /></div>
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
              <strong>{generatedPlan.title}</strong>
              <p>{generatedPlan.summary}</p>
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
              <span>{missionCompleted ? '완료' : stateLabel(curriculumSteps[currentStepIndex - 1]?.state ?? 'current')}</span>
            </div>
            <ol className={styles.stepList}>
              {curriculumSteps.map((step, index) => (
                <li className={styles.stepItem} data-state={missionCompleted ? 'done' : step.state} key={`${step.title}-${index}`}>
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

        <main className={styles.guidePanel} aria-label="학습 가이드">
          <section className={styles.missionCard}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionLabel}>오늘의 미션</span>
                <h2>{activeMission.title}</h2>
              </div>
              <span className={styles.sourceBadge}>{activeMission.sourceLabel}</span>
            </div>
            <p>{activeMission.detail}</p>
            <ul className={styles.criteriaList}>
              {activeMission.criteria.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.tutorCard} aria-label="AI 튜터 안내">
            <div className={styles.tutorAvatar}>AI</div>
            <div>
              <strong>ICU 튜터</strong>
              <p>{activeMission.hint}</p>
            </div>
          </section>

          <article className={styles.explanationCard}>
            <span className={styles.sectionLabel}>개념 설명</span>
            <h3>{activeMission.guideTitle}</h3>
            <p>{activeMission.guideDetail}</p>
          </article>

          <article className={styles.practiceCard}>
            <span className={styles.sectionLabel}>이번 실습</span>
            <p>{activeMission.practiceDetail}</p>
          </article>

          {hintVisible ? (
            <article className={styles.hintCard} aria-live="polite">
              <span className={styles.sectionLabel}>힌트</span>
              <h3>먼저 바뀌는 지점을 찾아보세요</h3>
              <p>{activeMission.hint}</p>
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
              {activeMission.sources.map((source) => (
                <li key={source}>{source}</li>
              ))}
            </ul>
          </article>

          <form className={styles.tutorComposer}>
            <input placeholder="튜터에게 질문하기..." aria-label="튜터에게 질문하기" />
            <button type="button">전송</button>
          </form>
        </main>

        <section className={styles.editorPanel} aria-label="코드 에디터와 실행 결과">
          <div className={styles.editorToolbar}>
            <div className={styles.editorTabs} role="tablist" aria-label="열린 파일">
              {editorFiles.map((file) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={file.path === activeFile?.path}
                  className={styles.editorTab}
                  data-active={file.path === activeFile?.path}
                  key={file.path}
                  onClick={() => setActiveFilePath(file.path)}
                >
                  {file.name}
                </button>
              ))}
            </div>
            <div className={styles.editorActions}>
              <span className={styles.languageBadge}>{activeMission.stepLabel}</span>
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
          <div className={styles.editorBody}>
            <div className={styles.codeBlock} aria-label={`${activeMission.fileName} 코드`}>
              <Editor
                height="100%"
                path={activeFile?.path}
                defaultPath={activeFile?.path}
                defaultLanguage={activeFile?.language}
                defaultValue={activeFile?.value}
                language={activeFile?.language}
                value={activeFile?.value ?? ''}
                saveViewState
                theme="vs-dark"
                onChange={(value) => updateActiveFile(value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: "'SFMono-Regular', Consolas, monospace",
                  scrollBeyondLastLine: false,
                  padding: { top: 16, bottom: 16 },
                }}
              />
            </div>
            <aside className={styles.previewPanel} aria-label="실행 결과 화면">
              <div className={styles.previewToolbar}>
                <div>
                  <span>Preview</span>
                  <strong>{runnableFile?.name ?? renderPreview.componentName}</strong>
                </div>
                <div className={styles.previewActions} aria-label="미리보기 동작">
                  <button type="button" onClick={handleRun} disabled={runState === 'running'}>새로고침</button>
                  <button type="button" onClick={resetActiveFile}>초기화</button>
                </div>
              </div>
              <div className={styles.previewViewport} data-state={runPreview.status}>
                {renderPreview.canRender ? (
                  <iframe
                    className={styles.previewIframe}
                    sandbox="allow-scripts"
                    srcDoc={getIframeSrcDoc(previewCode, renderPreview.componentName)}
                    title="React Preview"
                  />
                ) : (
                  <div className={styles.previewEmpty}>
                    <strong>화면 미리보기 없음</strong>
                    <p>현재 파일은 콘솔 실행 결과로 확인합니다.</p>
                  </div>
                )}
              </div>
              <div className={styles.previewConsole} data-state={runPreview.status} aria-live="polite">
                <div>
                  <strong>Console</strong>
                  <span>{runPreview.status === 'running' ? 'running' : runPreview.status}</span>
                </div>
                {runPreview.error ? <p className={styles.previewError}>{runPreview.error}</p> : null}
                {runPreview.result ? <p>return: {runPreview.result}</p> : null}
                <ol>
                  {consoleLines.map((line, index) => (
                    <li key={`${index}-${line}`}>{line}</li>
                  ))}
                </ol>
              </div>
            </aside>
          </div>
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
            <h3>지금 할 수 있는 일</h3>
            <button type="button" onClick={handleShowHint}>힌트 보기</button>
            <button type="button" onClick={handleShowReview}>코드 리뷰 요청</button>
            <button
              type="button"
              className={styles.nextStepButton}
              disabled={!canAdvance}
              onClick={handleAdvanceStep}
            >
              {nextStepButtonLabel}
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
