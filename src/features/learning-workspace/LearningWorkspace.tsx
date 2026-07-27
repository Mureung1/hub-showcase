import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { shouldUseServerApi } from '../../app/icuApiMode'
import { createFallbackCurriculumPlan } from '../curriculum/api/curriculumClient'
import type { GeneratedCurriculumPlan } from '../curriculum/model/curriculumGenerator'
import {
  resolveGeneratedCurriculumPlan,
  useGeneratedCurriculumStore,
} from '../curriculum/model/useGeneratedCurriculumStore'
import { saveMissionProgress } from '../learning-progress/api/learningProgressClient'
import { executeCode, type ReactPreviewBundle } from './api/codeRunnerClient'
import {
  PreviewCancelledError,
  PreviewRenderError,
  PreviewTimeoutError,
} from './previewRequestCoordinator'
import { useReactPreviewBridge } from './useReactPreviewBridge'
import { WorkspaceCurriculumPanel } from './components/WorkspaceCurriculumPanel'
import { WorkspaceEditorPanel } from './components/WorkspaceEditorPanel'
import { WorkspaceGuidePanel } from './components/WorkspaceGuidePanel'
import { WorkspaceHeader } from './components/WorkspaceHeader'
import { WorkspaceResultsPanel } from './components/WorkspaceResultsPanel'
import {
  useLearningProgressStore,
  type LearningActivityItem,
  type LearningRunState,
  type LearningTestResult,
} from '../learning-progress/model/useLearningProgressStore'
import { useLearningProfileStore } from '../profile/model/useLearningProfileStore'
import styles from './LearningWorkspace.module.css'
import {
  generatedMissionId,
  getInitialStepOffset,
  getResultMessage,
  isFinalStep,
  toLearningRunState,
  type RunState,
} from './workspaceInteraction'
import {
  createActiveMissionPresentation,
  createInitialRunPreviewState,
  createSteps,
  createTestCases,
  createWorkspaceEditorFiles,
  createWorkspaceModeLabel,
  defaultCareerGoal,
  getExecutionLanguage,
  getExecutionPanelModel,
  getLogTime,
  initialActivityItems,
  resolveActiveGeneratedStep,
  resolveWorkspaceMission,
  type WorkspaceEditorFile,
  type WorkspaceMission,
} from './workspaceMission'

type LearningWorkspaceViewProps = {
  generatedPlan: GeneratedCurriculumPlan
  hasSavedGeneratedPlan: boolean
  mission: WorkspaceMission
}

export default function LearningWorkspace() {
  const [searchParams] = useSearchParams()
  const { profile } = useLearningProfileStore()
  const generatedCurriculum = useGeneratedCurriculumStore((state) => state.generatedCurriculum)
  const profileGoal = profile?.learningGoal ?? defaultCareerGoal
  const selectedMissionId = searchParams.get('mission') ?? generatedMissionId
  const fallbackGeneratedPlan = useMemo(
    () => createFallbackCurriculumPlan(profileGoal),
    [profileGoal],
  )
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

function LearningWorkspaceView({
  generatedPlan,
  hasSavedGeneratedPlan,
  mission,
}: LearningWorkspaceViewProps) {
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
  const [activeStepOffset, setActiveStepOffset] = useState(
    () => savedProgress?.activeStepOffset ?? getInitialStepOffset(mission.id),
  )
  const [activityLog, setActivityLog] = useState<LearningActivityItem[]>(
    savedProgress?.activityLog.length ? savedProgress.activityLog : initialActivityItems,
  )
  const runAbortControllerRef = useRef<AbortController | null>(null)
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
  const nextStepButtonLabel = missionCompleted
    ? '완료됨'
    : finalStep
      ? '오늘 미션 완료'
      : '다음 단계'
  const planSummaryItems = [
    { label: '학습 목표', value: generatedPlan.goal },
    { label: '추천 트랙', value: generatedPlan.focusRole || generatedPlan.title },
    { label: '예상 기간', value: generatedPlan.estimatedDuration },
  ]

  const [editorFiles, setEditorFiles] = useState<WorkspaceEditorFile[]>(() =>
    createWorkspaceEditorFiles(activeMission),
  )
  const [activeFilePath, setActiveFilePath] = useState(
    () => createWorkspaceEditorFiles(activeMission)[0]?.path ?? '',
  )
  const [runPreview, setRunPreview] = useState(() => createInitialRunPreviewState())
  const { cancelPreview, iframeRef, previewUrl, renderPreview } = useReactPreviewBridge()
  const runButtonRef = useRef<HTMLButtonElement | null>(null)
  const isRunning = runState === 'running' || runState === 'compiling' || runState === 'rendering'

  const activeFile = editorFiles.find((file) => file.path === activeFilePath) ?? editorFiles[0]
  const runnableFile = editorFiles.find((file) => /\.(jsx?|tsx?)$/i.test(file.name)) ?? activeFile
  const code = activeFile?.value ?? ''
  const runnableCode = runnableFile?.value ?? code
  const cssCode = editorFiles.find((file) => file.name.toLowerCase().endsWith('.css'))?.value ?? ''

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

    const initialFile = createWorkspaceEditorFiles(activeMission).find(
      (file) => file.path === activeFile.path,
    )
    if (!initialFile) {
      return
    }

    setEditorFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.path === activeFile.path ? { ...file, value: initialFile.value } : file,
      ),
    )
  }

  const executionPanel = useMemo(
    () => getExecutionPanelModel(activeMission.mode, runnableFile?.name ?? activeMission.fileName),
    [activeMission.fileName, activeMission.mode, runnableFile?.name],
  )

  const runtimeSummaryItems = [
    { label: '실행 모드', value: createWorkspaceModeLabel(activeMission.mode) },
    { label: '실행 파일', value: runnableFile?.name ?? activeMission.fileName },
    { label: '미션 ID', value: activeMission.id },
    { label: '계획 출처', value: hasSavedGeneratedPlan ? '저장된 커리큘럼' : '기본 학습 계획' },
  ]

  const consoleLines =
    runPreview.logs.length > 0
      ? runPreview.logs
      : runPreview.status === 'idle'
        ? ['실행하면 console.log 출력이 여기에 표시됩니다.']
        : ['출력 없이 실행이 끝났습니다.']

  useEffect(() => {
    return () => {
      runAbortControllerRef.current?.abort()
      cancelPreview()
    }
  }, [cancelPreview])

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

  function recordServerSyncFailure(missionId: string, stepOffset: number) {
    setActivityLog((currentLog) => {
      const nextLog = prependActivity(
        currentLog,
        createActivity(
          '서버 동기화 실패',
          '로컬 진행 기록은 저장했습니다. 백엔드를 실행한 뒤 다시 시도하세요.',
        ),
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
    lastTestResult?: LearningTestResult | null
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
      lastTestResult: input.lastTestResult,
    })
      .then(({ progress }) => upsertMissionProgress(progress))
      .catch(() => recordServerSyncFailure(input.missionId, input.activeStepOffset))
  }

  async function handleRun() {
    runAbortControllerRef.current?.abort()
    cancelPreview()
    const abortController = new AbortController()
    const requestId = crypto.randomUUID()
    const usesReactPreview = activeMission.mode === 'react'
    const initialState: RunState = usesReactPreview ? 'compiling' : 'running'
    runAbortControllerRef.current = abortController

    setRunState(initialState)
    setRunPreview({
      status: initialState,
      logs: [
        usesReactPreview ? 'React 코드를 컴파일하고 있습니다...' : '코드를 실행하고 있습니다...',
      ],
    })
    setMissionCompleted(false)
    setReviewVisible(false)
    const runLog = addActivity(
      '테스트 실행',
      `${activeMission.fileName} 기준으로 백엔드에 코드를 전송하여 실행합니다.`,
    )
    let latestLogs: string[] = []
    let latestPreview: ReactPreviewBundle | undefined

    try {
      const language = getExecutionLanguage(
        runnableFile?.name ?? activeMission.fileName,
        activeMission.mode,
      )
      const res = await executeCode(runnableCode, language, {
        css: cssCode,
        signal: abortController.signal,
      })
      if (abortController.signal.aborted) return

      latestLogs = res.logs
      latestPreview = res.preview
      if (res.success && res.preview) {
        setRunState('rendering')
        setRunPreview({
          status: 'rendering',
          logs: [...res.logs, '실행 화면을 렌더링하고 있습니다...'],
          preview: res.preview,
        })
        await renderPreview(requestId, res.preview)
        if (abortController.signal.aborted) return
      }

      const nextState = res.success ? 'passed' : 'failed'
      const detailMsg = res.success
        ? `실행이 성공했습니다. (출력: ${res.logs.length}줄)`
        : `실행 실패: ${res.error || '오류 발생'}`
      const nextAttemptCount = runAttemptCount + 1
      const resultLog = prependActivity(
        runLog,
        createActivity(nextState === 'passed' ? '테스트 통과' : '테스트 실패', detailMsg),
      )

      setRunState(nextState)
      setRunPreview({
        status: nextState,
        logs: res.logs,
        error: res.error,
        result: res.result,
        preview: res.preview,
      })
      setRunAttemptCount(nextAttemptCount)
      setActivityLog(resultLog)

      const nextTestCases = createTestCases(mission, nextState)
      const testResult = {
        passed: nextTestCases.filter((item) => item.state === 'passed').length,
        total: nextTestCases.length,
        ranAt: new Date().toISOString(),
      }

      recordRunResult({
        missionId: mission.id,
        runState: nextState,
        runAttemptCount: nextAttemptCount,
        activeStepOffset,
        activityLog: resultLog,
        lastTestResult: testResult,
      })
      syncMissionProgressToServer({
        missionId: mission.id,
        runState: nextState,
        runAttemptCount: nextAttemptCount,
        activeStepOffset,
        activityLog: resultLog,
        lastTestResult: testResult,
      })
    } catch (error) {
      if (
        abortController.signal.aborted ||
        error instanceof PreviewCancelledError ||
        (error instanceof DOMException && error.name === 'AbortError')
      ) {
        return
      }

      const timeout = error instanceof PreviewTimeoutError
      const learnerFailure = timeout || error instanceof PreviewRenderError
      const nextState: RunState = timeout ? 'timeout' : 'failed'
      const errorMessage = error instanceof Error ? error.message : '코드 실행에 실패했습니다.'
      setRunPreview({
        status: nextState,
        logs: latestLogs,
        error: errorMessage,
        preview: latestPreview,
      })
      setRunState(nextState)

      const resultLog = prependActivity(
        runLog,
        createActivity(
          learnerFailure
            ? timeout
              ? '실행 시간 초과'
              : '화면 렌더링 실패'
            : '실행 환경 연결 실패',
          learnerFailure ? errorMessage : '실행 서버 또는 Preview 앱 연결 상태를 확인해 주세요.',
        ),
      )
      setActivityLog(resultLog)

      if (learnerFailure) {
        const nextAttemptCount = runAttemptCount + 1
        setRunAttemptCount(nextAttemptCount)
        const nextTestCases = createTestCases(mission, 'failed')
        const testResult = {
          passed: nextTestCases.filter((item) => item.state === 'passed').length,
          total: nextTestCases.length,
          ranAt: new Date().toISOString(),
        }
        recordRunResult({
          missionId: mission.id,
          runState: 'failed',
          runAttemptCount: nextAttemptCount,
          activeStepOffset,
          activityLog: resultLog,
          lastTestResult: testResult,
        })
        syncMissionProgressToServer({
          missionId: mission.id,
          runState: 'failed',
          runAttemptCount: nextAttemptCount,
          activeStepOffset,
          activityLog: resultLog,
          lastTestResult: testResult,
        })
      }
    } finally {
      if (runAbortControllerRef.current === abortController) {
        runAbortControllerRef.current = null
      }
    }
  }

  function handleShowHint() {
    setHintVisible(true)
    const nextLog = addActivity(
      '힌트 확인',
      `${activeMission.title} 단계의 접근 방향을 확인했습니다.`,
    )
    recordMissionActivity({
      missionId: mission.id,
      activeStepOffset,
      activityLog: nextLog,
    })
    syncMissionProgressToServer({
      missionId: mission.id,
      runState: toLearningRunState(runState),
      runAttemptCount,
      activeStepOffset,
      activityLog: nextLog,
    })
  }

  function handleShowReview() {
    setReviewVisible(true)
    const nextLog = addActivity(
      '코드 리뷰 요청',
      runState === 'passed'
        ? '통과한 코드의 개선점을 확인했습니다.'
        : '리뷰 전에 실패 항목을 먼저 확인합니다.',
    )
    recordMissionActivity({
      missionId: mission.id,
      activeStepOffset,
      activityLog: nextLog,
    })
    syncMissionProgressToServer({
      missionId: mission.id,
      runState: toLearningRunState(runState),
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
      const nextLog = addActivity(
        '오늘 미션 완료',
        '생성 커리큘럼의 오늘 학습 단계를 모두 마쳤습니다.',
      )
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
    const nextGeneratedStep = resolveActiveGeneratedStep(generatedPlan, nextStepOffset)
    const nextMission = createActiveMissionPresentation(mission, nextGeneratedStep)
    const nextFiles = createWorkspaceEditorFiles(nextMission)
    const nextLog = addActivity('다음 단계', '현재 단계를 완료하고 다음 학습 단계로 이동했습니다.')
    setActiveStepOffset(nextStepOffset)
    setRunState('idle')
    setRunAttemptCount(0)
    setHintVisible(false)
    setReviewVisible(false)
    setEditorFiles(nextFiles)
    setActiveFilePath(nextFiles[0]?.path ?? '')
    setRunPreview(createInitialRunPreviewState())
    cancelPreview()
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

  useEffect(() => {
    function handleRunShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !isRunning) {
        event.preventDefault()
        runButtonRef.current?.click()
      }
    }

    window.addEventListener('keydown', handleRunShortcut)
    return () => window.removeEventListener('keydown', handleRunShortcut)
  }, [isRunning])

  return (
    <section className={styles.page} aria-labelledby="workspace-title">
      <WorkspaceHeader
        mission={activeMission}
        executionPanelTitle={executionPanel.title}
        runtimeStatus={runPreview.status}
        runtimeSummaryItems={runtimeSummaryItems}
        progressPercent={progressPercent}
        passedCount={passedCount}
        testCaseCount={testCases.length}
        isRunning={isRunning}
        runState={runState}
        missionCompleted={missionCompleted}
        failedCount={failedCount}
      />

      <div className={styles.workspaceGrid}>
        <WorkspaceCurriculumPanel
          missionTitle={activeMission.title}
          missionFileName={activeMission.fileName}
          curriculumSteps={curriculumSteps}
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          progressPercent={progressPercent}
          hasSavedGeneratedPlan={hasSavedGeneratedPlan}
          planTitle={generatedPlan.title}
          planSummary={generatedPlan.summary}
          planSummaryItems={planSummaryItems}
          missionCompleted={missionCompleted}
        />

        <WorkspaceGuidePanel
          mission={activeMission}
          hintVisible={hintVisible}
          reviewVisible={reviewVisible}
          runState={runState}
        />

        <WorkspaceEditorPanel
          mission={activeMission}
          editorFiles={editorFiles}
          activeFile={activeFile}
          isRunning={isRunning}
          runState={runState}
          executionPanel={executionPanel}
          runPreview={runPreview}
          consoleLines={consoleLines}
          iframeRef={iframeRef}
          previewUrl={previewUrl}
          runButtonRef={runButtonRef}
          onSelectFile={setActiveFilePath}
          onRun={handleRun}
          onChangeActiveFile={updateActiveFile}
          onResetActiveFile={resetActiveFile}
        />
      </div>
      <WorkspaceResultsPanel
        activityLog={activityLog}
        canAdvance={canAdvance}
        failedCount={failedCount}
        nextStepButtonLabel={nextStepButtonLabel}
        onAdvanceStep={handleAdvanceStep}
        onShowHint={handleShowHint}
        onShowReview={handleShowReview}
        passedCount={passedCount}
        pendingCount={pendingCount}
        resultMessage={resultMessage}
        testCases={testCases}
      />
    </section>
  )
}
