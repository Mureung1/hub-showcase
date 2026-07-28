import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { shouldUseServerApi } from '../../app/icuApiMode'
import {
  createFallbackCurriculumPlan,
  getGeneratedCurriculum,
} from '../curriculum/api/curriculumClient'
import {
  recentMistakes,
  reviewSummaryItems,
  todayQueue,
  type TodayQueueItem,
  type TodayQueueStatus,
} from './data/todayLearning'
import { useLearningProfileStore } from '../profile/model/useLearningProfileStore'
import {
  useLearningProgressStore,
  type LearningMissionProgress,
} from '../learning-progress/model/useLearningProgressStore'
import {
  resolveGeneratedCurriculumPlan,
  useGeneratedCurriculumStore,
} from '../curriculum/model/useGeneratedCurriculumStore'
import { getTodayProgress } from '../learning-progress/api/learningProgressClient'
import { getMistakeNotes } from '../mistake-notes/api/mistakeNoteClient'
import { useMistakeNoteStore } from '../mistake-notes/model/useMistakeNoteStore'
import {
  listGitLabAttempts,
  type GitLabAttempt,
} from '../git-lab/api/gitLabAttemptClient'
import {
  createActiveMissionPresentation,
  createWorkspaceEditorFiles,
  resolveActiveGeneratedStep,
  resolveWorkspaceMission,
} from '../learning-workspace/workspaceMission'
import { getInitialStepOffset } from '../learning-workspace/workspaceInteraction'
import { ProgressBar } from './ProgressBar'
import { TrackIcon } from './TrackIcon'
import {
  findTopWeakConcept,
  formatTestResultLabel,
  getGitLabTrackProgress,
  getTrackStatus,
  type TrackStatus,
} from './model/trackStats'
import styles from './TodayLearningHub.module.css'

const defaultCareerGoal = 'DEVOPS 엔지니어가 되고 싶어'

const trackStatusLabels: Record<TrackStatus, string> = {
  in_progress: '진행 중',
  completed: '완료',
  not_started: '시작 전',
  unavailable: '준비 중',
}

const queueStatusLabels: Record<TodayQueueStatus, string> = {
  done: '완료',
  current: '현재',
  locked: '대기',
  optional: '선택',
}

function isMissionComplete(progress: LearningMissionProgress | undefined) {
  return Boolean(progress?.completedAt || progress?.runState === 'passed')
}

function applyQueueProgress(
  queue: TodayQueueItem[],
  missions: Record<string, LearningMissionProgress>,
): TodayQueueItem[] {
  const activeProgressId = queue.find((item) => {
    const progress = missions[item.id]

    return progress && !isMissionComplete(progress)
  })?.id
  let currentAssigned = Boolean(activeProgressId)

  return queue.map((item) => {
    const progress = missions[item.id]

    if (item.status === 'done' || isMissionComplete(progress)) {
      return { ...item, status: 'done' }
    }

    if (activeProgressId) {
      return item.id === activeProgressId
        ? { ...item, status: 'current' }
        : { ...item, status: item.status === 'optional' ? 'optional' : 'locked' }
    }

    if (item.status === 'optional') {
      return item
    }

    if (!currentAssigned) {
      currentAssigned = true
      return { ...item, status: 'current' }
    }

    return { ...item, status: 'locked' }
  })
}

function getCompletionPercent(queue: TodayQueueItem[]) {
  if (queue.length === 0) {
    return 0
  }

  const completedCount = queue.filter((item) => item.status === 'done').length

  return Math.round((completedCount / queue.length) * 100)
}

export function TodayLearningHub() {
  const serverMode = shouldUseServerApi()
  const { profile, loadProfile } = useLearningProfileStore()
  const generatedCurriculum = useGeneratedCurriculumStore((state) => state.generatedCurriculum)
  const hydrateGeneratedCurriculum = useGeneratedCurriculumStore(
    (state) => state.hydrateGeneratedCurriculum,
  )
  const missionProgress = useLearningProgressStore((state) => state.missions)
  const hydrateMissionProgress = useLearningProgressStore((state) => state.hydrateMissionProgress)
  const mistakeNotes = useMistakeNoteStore((state) => state.notes)
  const hydrateMistakeNotes = useMistakeNoteStore((state) => state.hydrateMistakeNotes)
  const [gitLabAttempts, setGitLabAttempts] = useState<GitLabAttempt[]>([])
  const [serverDataStatus, setServerDataStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [reloadKey, setReloadKey] = useState(0)
  const profileGoal = profile?.learningGoal ?? defaultCareerGoal
  const fallbackGeneratedPlan = useMemo(
    () => createFallbackCurriculumPlan(profileGoal),
    [profileGoal],
  )
  const generatedPlan = useMemo(
    () => resolveGeneratedCurriculumPlan(generatedCurriculum, fallbackGeneratedPlan),
    [fallbackGeneratedPlan, generatedCurriculum],
  )
  const dailyMinutes = profile?.dailyStudyMinutes ?? 30

  useEffect(() => {
    let cancelled = false

    if (!serverMode) return () => undefined

    setServerDataStatus('loading')
    void Promise.all([
      loadProfile(),
      getTodayProgress(),
      getGeneratedCurriculum({ mode: 'server' }),
      getMistakeNotes(),
      listGitLabAttempts(),
    ])
      .then(([, progressResponse, curriculumResponse, mistakeResponse, gitLabResponse]) => {
        if (cancelled) return

        hydrateMissionProgress(progressResponse.missions)
        hydrateGeneratedCurriculum(curriculumResponse.generatedCurriculum)
        hydrateMistakeNotes(mistakeResponse.notes)
        setGitLabAttempts(gitLabResponse.attempts)
        setServerDataStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setServerDataStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [
    hydrateGeneratedCurriculum,
    hydrateMissionProgress,
    hydrateMistakeNotes,
    loadProfile,
    reloadKey,
    serverMode,
  ])

  const now = useMemo(() => new Date(), [])
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      }).format(now),
    [now],
  )
  const generatedQueue = useMemo<TodayQueueItem[]>(
    () => [
      {
        id: 'generated-first-mission',
        title: generatedPlan.todayMission.title,
        detail: generatedPlan.todayMission.detail,
        durationMinutes: generatedPlan.todayMission.durationMinutes,
        status: 'current',
      },
      ...todayQueue.filter((item) => item.id !== 'counter-mission'),
    ],
    [generatedPlan],
  )
  const displayQueue = useMemo(
    () => applyQueueProgress(generatedQueue, missionProgress),
    [generatedQueue, missionProgress],
  )
  const totalQueueMinutes = useMemo(
    () => displayQueue.reduce((total, item) => total + item.durationMinutes, 0),
    [displayQueue],
  )
  const completionPercent = useMemo(() => getCompletionPercent(displayQueue), [displayQueue])
  const stats = useMemo(
    () => [
      { label: '오늘 학습', value: dailyMinutes + '분', tone: 'blue' },
      {
        label: '진행 트랙',
        value: String(profile?.preferredTracks.length ?? 3).padStart(2, '0'),
        tone: 'cyan',
      },
      { label: '큐 총합', value: totalQueueMinutes + '분', tone: 'peach' },
      { label: '완료율', value: completionPercent + '%', tone: 'green' },
    ],
    [completionPercent, dailyMinutes, profile?.preferredTracks.length, totalQueueMinutes],
  )
  const recentOpenMistakes = useMemo(
    () =>
      mistakeNotes
        .filter((note) => note.status === 'open')
        .sort(
          (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        )
        .slice(0, 3),
    [mistakeNotes],
  )
  const reviewMistakeItems = useMemo(
    () =>
      recentOpenMistakes.length > 0
        ? recentOpenMistakes.map((note) => ({
            id: note.id,
            title: note.lessonTitle,
            detail: `${note.command} · ${note.reason}`,
          }))
        : serverMode ? [] : recentMistakes,
    [recentOpenMistakes, serverMode],
  )
  const activeMissionId =
    displayQueue.find((item) => item.status === 'current')?.id ?? 'generated-first-mission'
  const activeMissionTestResult = missionProgress[activeMissionId]?.lastTestResult ?? null
  const activeStepOffset =
    missionProgress[activeMissionId]?.activeStepOffset ?? getInitialStepOffset(activeMissionId)
  const previewMission = useMemo(
    () => resolveWorkspaceMission(activeMissionId, generatedPlan),
    [activeMissionId, generatedPlan],
  )
  const previewActiveStep = useMemo(
    () => resolveActiveGeneratedStep(generatedPlan, activeStepOffset),
    [activeStepOffset, generatedPlan],
  )
  const previewActiveMission = useMemo(
    () => createActiveMissionPresentation(previewMission, previewActiveStep),
    [previewActiveStep, previewMission],
  )
  const topWeakConcept = useMemo(() => findTopWeakConcept(mistakeNotes), [mistakeNotes])
  const stepPosition = Math.max(
    displayQueue.findIndex((item) => item.id === activeMissionId) + 1,
    1,
  )
  const stepTotal = displayQueue.length
  const previewFiles = useMemo(
    () => createWorkspaceEditorFiles(previewActiveMission),
    [previewActiveMission],
  )
  const [selectedPreviewFileName, setSelectedPreviewFileName] = useState<string | null>(null)
  const selectedPreviewFile =
    previewFiles.find((file) => file.name === selectedPreviewFileName) ?? previewFiles[0]
  const gitLabProgress = useMemo(
    () => getGitLabTrackProgress(serverMode ? gitLabAttempts : undefined),
    [gitLabAttempts, serverMode],
  )
  const trackRows = useMemo(
    () => [
      {
        id: 'git-lab',
        title: '깃 시뮬레이터',
        percent: gitLabProgress.percent,
        stepLabel: `Step ${Math.min(gitLabProgress.clearedCount + 1, gitLabProgress.totalCount)} / ${gitLabProgress.totalCount}`,
        recentLearningLabel:
          gitLabProgress.clearedCount > 0 ? `${gitLabProgress.clearedCount}개 완료` : '—',
        nextLearningLabel: '레벨 이어하기',
        actionHref: '/git-lab',
      },
      {
        id: 'react-practice',
        title: 'React 실습',
        percent: completionPercent,
        stepLabel: `Step ${stepPosition} / ${stepTotal}`,
        recentLearningLabel: '오늘',
        nextLearningLabel: previewActiveMission.stepLabel,
        actionHref: `/workspace?mission=${activeMissionId}`,
      },
      {
        id: 'docker-practice',
        title: 'Docker 실습',
        percent: null as number | null,
        stepLabel: 'Step 0 / 4',
        recentLearningLabel: '—',
        nextLearningLabel: '컨테이너 기초',
        actionHref: null,
      },
    ],
    [
      activeMissionId,
      completionPercent,
      gitLabProgress.clearedCount,
      gitLabProgress.percent,
      gitLabProgress.totalCount,
      previewActiveMission.stepLabel,
      stepPosition,
      stepTotal,
    ],
  )

  if (serverMode && serverDataStatus === 'loading') {
    return (
      <main className={styles.page}>
        <section className={styles.content}>
          <section className={styles.emptyState} role="status">
            <div>
              <strong>오늘 학습 데이터를 불러오는 중입니다.</strong>
              <p>프로필과 진행 상태를 서버에서 확인하고 있어요.</p>
            </div>
          </section>
        </section>
      </main>
    )
  }

  if (serverMode && serverDataStatus === 'error') {
    return (
      <main className={styles.page}>
        <section className={styles.content}>
          <section className={styles.emptyState} role="alert">
            <div>
              <strong>오늘 학습 데이터를 불러오지 못했습니다.</strong>
              <p>서버 연결을 확인한 뒤 다시 시도해 주세요.</p>
            </div>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)}>다시 시도</button>
          </section>
        </section>
      </main>
    )
  }

  if (serverMode && !generatedCurriculum) {
    return (
      <main className={styles.page}>
        <section className={styles.content}>
          <section className={styles.emptyState} aria-label="커리큘럼 없음">
            <div>
              <strong>커리큘럼을 먼저 생성해 주세요.</strong>
              <p>학습 목표를 입력하면 실제 서버에 저장되는 오늘의 계획을 만들 수 있습니다.</p>
            </div>
            <Link to="/today/goal">커리큘럼 만들기</Link>
          </section>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.page} aria-labelledby="today-title">
      <section className={styles.content}>
        <header className={styles.topbar}>
          <div>
            <h1 id="today-title">학습 진행 현황</h1>
            <p>{todayLabel}</p>
          </div>
          <label className={styles.search}>
            <span aria-hidden="true">Search</span>
            <input type="search" placeholder="학습 검색" />
          </label>
          <div className={styles.topbarActions}>
            <Link className={styles.historyTabLink} to="/today/goal">
              새 목표 만들기
            </Link>
            <Link className={styles.profileLink} to="/profile">
              프로필 조정
            </Link>
          </div>
        </header>

        {!profile ? (
          <section className={styles.emptyState} aria-label="프로필 없음">
            <div>
              <strong>학습 프로필이 아직 없습니다.</strong>
              <p>목표와 관심 트랙을 설정하면 오늘 학습 큐를 더 정확하게 추천할 수 있습니다.</p>
            </div>
            <Link to="/profile">프로필 만들기</Link>
          </section>
        ) : null}

        <section className={styles.focusCard} aria-labelledby="welcome-title">
          <div className={styles.focusHeader}>
            <div className={styles.focusCopy}>
              <p className={styles.focusEyebrow}>오늘 이어갈 학습</p>
              <h2 id="welcome-title">{previewActiveMission.title}</h2>
              <p className={styles.focusDetail}>{previewActiveMission.detail}</p>
            </div>
            <div className={styles.focusActionPanel}>
              <span className={styles.focusStep}>
                Step {stepPosition} / {stepTotal} · {previewActiveMission.stepLabel}
              </span>
              <Link
                className={styles.primaryCta}
                to={`/workspace?mission=${previewActiveMission.id}`}
              >
                이어서 학습하기
              </Link>
            </div>
          </div>

          <div className={styles.focusProgress}>
            <ProgressBar percent={completionPercent} label="오늘 학습 진행률 퍼센트" />
          </div>

          <dl className={styles.focusMetrics} aria-label="오늘 학습 상태 요약">
            {stats.map((stat) => (
              <div className={styles.focusMetric} data-tone={stat.tone} key={stat.label}>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
            <div
              className={styles.focusMetric}
              data-tone={activeMissionTestResult ? 'green' : 'muted'}
            >
              <dt>테스트 상태</dt>
              <dd>{formatTestResultLabel(activeMissionTestResult)}</dd>
            </div>
            {topWeakConcept ? (
              <div className={styles.focusMetric} data-tone="warning">
                <dt>취약 개념</dt>
                <dd>{topWeakConcept}</dd>
              </div>
            ) : null}
          </dl>
        </section>
        <div className={styles.midGrid}>
          <section className={styles.queueCard} aria-labelledby="queue-title">
            <div className={styles.panelTitleRow}>
              <h2 id="queue-title">오늘 학습 큐</h2>
              <span>총 {totalQueueMinutes}분</span>
            </div>
            <ol className={styles.queueList}>
              {displayQueue.map((item, index) => (
                <li className={styles.queueRow} data-status={item.status} key={item.id}>
                  <span className={styles.queueIndex}>{index + 1}</span>
                  <div className={styles.queueBody}>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                  <span className={styles.queueStatusBadge} data-status={item.status}>
                    {queueStatusLabels[item.status]}
                  </span>
                  <span className={styles.queueDuration}>{item.durationMinutes}분</span>
                  {item.status === 'current' ? (
                    <Link
                      className={styles.queueContinueButton}
                      to={'/workspace?mission=' + item.id}
                    >
                      계속하기
                    </Link>
                  ) : (
                    <Link
                      className={styles.queueMoreLink}
                      to={'/workspace?mission=' + item.id}
                      aria-label={`${item.title} 열기`}
                    >
                      ···
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section className={styles.reviewCard} aria-labelledby="review-title">
            <div className={styles.panelTitleRow}>
              <h2 id="review-title">복습과 오답</h2>
              <Link to="/mistake-notes">전체보기</Link>
            </div>
            <ul>
              {[...(serverMode ? [] : reviewSummaryItems), ...reviewMistakeItems].map((item) => (
                <li key={item.id}>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className={styles.bottomGrid}>
          <section className={styles.trackSection} aria-labelledby="tracks-title">
            <div className={styles.panelTitleRow}>
              <h2 id="tracks-title">학습 목록</h2>
              <Link to="/curriculum/history">전체 보기</Link>
            </div>
            <div
              className={styles.trackTable}
              role="table"
              aria-label="트랙별 진행률과 현재 및 다음 학습"
            >
              <div className={styles.trackTableHeader} role="row">
                <span role="columnheader">트랙</span>
                <span role="columnheader">진행률</span>
                <span role="columnheader">현재 단계</span>
                <span role="columnheader">최근 학습</span>
                <span role="columnheader">다음 학습</span>
                <span role="columnheader">상태</span>
              </div>
              {trackRows.map((track) => {
                const status = getTrackStatus(track.percent)

                return (
                  <div
                    className={styles.trackTableRow}
                    role="row"
                    key={track.id}
                    data-status={status}
                  >
                    <div className={styles.trackIdentityCell} role="cell">
                      <div className={styles.trackTitleRow}>
                        <span className={styles.trackIcon} data-track={track.id} aria-hidden="true">
                          <TrackIcon trackId={track.id} />
                        </span>
                        <h3>{track.title}</h3>
                      </div>
                    </div>
                    <div className={styles.trackProgressCell} role="cell">
                      <span className={styles.trackCellLabel}>진행률</span>
                      <strong>{track.percent !== null ? `${track.percent}%` : '—'}</strong>
                      {track.percent !== null ? (
                        <ProgressBar
                          percent={track.percent}
                          label={`${track.title} 진행률 ${track.percent}퍼센트`}
                        />
                      ) : null}
                    </div>
                    <div className={styles.trackTextCell} role="cell">
                      <span className={styles.trackCellLabel}>현재 단계</span>
                      <span>{track.stepLabel}</span>
                    </div>
                    <div className={styles.trackTextCell} role="cell">
                      <span className={styles.trackCellLabel}>최근 학습</span>
                      <span>{track.recentLearningLabel}</span>
                    </div>
                    <div className={styles.trackTextCell} role="cell">
                      <span className={styles.trackCellLabel}>다음 학습</span>
                      {track.actionHref ? (
                        <Link to={track.actionHref}>{track.nextLearningLabel}</Link>
                      ) : (
                        <span>{track.nextLearningLabel}</span>
                      )}
                    </div>
                    <div className={styles.trackStatusCell} role="cell">
                      <span className={styles.trackCellLabel}>상태</span>
                      <span className={styles.trackTableStatus} data-status={status}>
                        {trackStatusLabels[status]}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <div className={styles.sideStack}>
            <section
              className={styles.workspacePreviewCard}
              aria-labelledby="workspace-preview-title"
            >
              <div className={styles.panelTitleRow}>
                <h2 id="workspace-preview-title">작업 공간 미리보기</h2>
                <Link to={`/workspace?mission=${activeMissionId}`}>워크스페이스로 이동</Link>
              </div>
              {previewFiles.length > 1 ? (
                <select
                  className={styles.workspacePreviewFileSelect}
                  aria-label="미리볼 파일 선택"
                  value={selectedPreviewFile?.name ?? ''}
                  onChange={(event) => setSelectedPreviewFileName(event.target.value)}
                >
                  {previewFiles.map((file) => (
                    <option key={file.path} value={file.name}>
                      {file.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <div className={styles.workspacePreviewGrid}>
                <div className={styles.workspacePreviewHint}>
                  <span>AI 힌트</span>
                  <p>{previewActiveMission.hint}</p>
                </div>
                <pre className={styles.workspacePreviewCode}>
                  <code>{selectedPreviewFile?.value ?? ''}</code>
                </pre>
              </div>
              {activeMissionTestResult ? (
                <p
                  className={styles.workspacePreviewBanner}
                  data-passed={activeMissionTestResult.passed === activeMissionTestResult.total}
                >
                  {activeMissionTestResult.passed} / {activeMissionTestResult.total} 테스트 통과
                  {activeMissionTestResult.passed < activeMissionTestResult.total
                    ? ' · 아직 통과하지 못한 항목이 있습니다.'
                    : ''}
                </p>
              ) : (
                <p className={styles.workspacePreviewBanner} data-passed="false">
                  아직 실행한 테스트가 없습니다.
                </p>
              )}
            </section>

          </div>
        </div>
      </section>
    </main>
  )
}
