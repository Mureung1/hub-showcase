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
import { useMistakeNoteStore } from '../mistake-notes/model/useMistakeNoteStore'
import {
  createActiveMissionPresentation,
  createWorkspaceEditorFiles,
  resolveActiveGeneratedStep,
  resolveWorkspaceMission,
} from '../learning-workspace/workspaceMission'
import { getInitialStepOffset } from '../learning-workspace/workspaceInteraction'
import { ProgressBar } from './ProgressBar'
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

const weekLabels = ['월', '화', '수', '목', '금', '토', '일']

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
  const { profile } = useLearningProfileStore()
  const generatedCurriculum = useGeneratedCurriculumStore((state) => state.generatedCurriculum)
  const hydrateGeneratedCurriculum = useGeneratedCurriculumStore(
    (state) => state.hydrateGeneratedCurriculum,
  )
  const missionProgress = useLearningProgressStore((state) => state.missions)
  const hydrateMissionProgress = useLearningProgressStore((state) => state.hydrateMissionProgress)
  const mistakeNotes = useMistakeNoteStore((state) => state.notes)
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

    if (shouldUseServerApi()) {
      void getTodayProgress()
        .then(({ missions }) => {
          if (!cancelled) {
            hydrateMissionProgress(missions)
          }
        })
        .catch(() => {
          // Keep the mock/local screen usable when the backend is not running.
        })

      void getGeneratedCurriculum({ mode: 'server' })
        .then(({ generatedCurriculum: serverSnapshot }) => {
          if (!cancelled && serverSnapshot) {
            hydrateGeneratedCurriculum(serverSnapshot)
          }
        })
        .catch(() => {
          // Keep local state available when server is offline.
        })
    }

    return () => {
      cancelled = true
    }
  }, [hydrateMissionProgress, hydrateGeneratedCurriculum])

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
  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat('ko-KR', { month: 'long', year: 'numeric' }).format(now),
    [now],
  )
  const calendarDays = useMemo(() => {
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7

    return [
      ...Array.from({ length: firstDay }, (_, index) => ({ key: `empty-${index}`, day: null })),
      ...Array.from({ length: daysInMonth }, (_, index) => ({
        key: `day-${index + 1}`,
        day: index + 1,
      })),
    ]
  }, [now])
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
        : recentMistakes,
    [recentOpenMistakes],
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
  const gitLabProgress = useMemo(() => getGitLabTrackProgress(), [])
  const trackRows = useMemo(
    () => [
      {
        id: 'git-lab',
        title: '깃 시뮬레이터',
        percent: gitLabProgress.percent,
        testResultLabel: `${gitLabProgress.percent}%`,
        actionLabel: '레벨 이어하기',
        actionHref: '/git-lab',
      },
      {
        id: 'react-practice',
        title: 'React 실습',
        percent: completionPercent,
        testResultLabel: formatTestResultLabel(activeMissionTestResult),
        actionLabel: '이어서 학습하기',
        actionHref: `/workspace?mission=${activeMissionId}`,
      },
      {
        id: 'docker-practice',
        title: 'Docker 실습',
        percent: null as number | null,
        testResultLabel: '준비 중',
        actionLabel: null,
        actionHref: null,
      },
    ],
    [activeMissionId, activeMissionTestResult, completionPercent, gitLabProgress.percent],
  )

  return (
    <main className={styles.page} aria-labelledby="today-title">
      <section className={styles.content}>
        <header className={styles.topbar}>
          <div>
            <h1 id="today-title">Dashboard</h1>
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

        <div className={styles.heroGrid}>
          <section className={styles.heroCard} aria-labelledby="welcome-title">
            <p className={styles.heroEyebrow}>오늘 목표</p>
            <h2 id="welcome-title">{previewActiveMission.title}</h2>
            <span>{previewActiveMission.detail}</span>
            <ProgressBar
              percent={completionPercent}
              label={`오늘 학습 진행률 ${completionPercent}퍼센트`}
            />
            <div className={styles.heroMeta}>
              <span>
                {stepPosition} / {stepTotal} 단계
              </span>
              <span>테스트 통과: {formatTestResultLabel(activeMissionTestResult)}</span>
              {topWeakConcept ? <span>취약 개념 · {topWeakConcept}</span> : null}
            </div>
          </section>

          <section className={styles.continueCard} aria-labelledby="continue-title">
            <p className={styles.continueEyebrow}>이어 학습하기</p>
            <h3 id="continue-title">{previewActiveMission.title}</h3>
            <p className={styles.continueStep}>
              Step {stepPosition}. {previewActiveMission.stepLabel}
            </p>
            <ProgressBar
              percent={completionPercent}
              label={`이어 학습하기 진행률 ${completionPercent}퍼센트`}
            />
            <Link className={styles.continueLink} to={`/workspace?mission=${activeMissionId}`}>
              이어서 학습하기
            </Link>
          </section>
        </div>

        <section className={styles.statsGrid} aria-label="오늘 학습 요약">
          {stats.map((stat) => (
            <article className={styles.statCard} data-tone={stat.tone} key={stat.label}>
              <span aria-hidden="true" />
              <strong>{stat.value}</strong>
              <p>{stat.label}</p>
            </article>
          ))}
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
                    <Link className={styles.queueContinueButton} to={'/workspace?mission=' + item.id}>
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
              {[...reviewSummaryItems, ...reviewMistakeItems].map((item) => (
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
            </div>
            <div className={styles.trackTable} role="table" aria-label="트랙별 진행률과 테스트 통과율">
              <div className={styles.trackTableHeader} role="row">
                <span role="columnheader">트랙</span>
                <span role="columnheader">진행률</span>
                <span role="columnheader">테스트 통과율</span>
              </div>
              {trackRows.map((track) => {
                const status = getTrackStatus(track.percent)

                return (
                  <div className={styles.trackTableRow} role="row" key={track.id} data-status={status}>
                    <div role="cell">
                      <div className={styles.trackTitleRow}>
                        <span className={styles.trackIcon} data-track={track.id} aria-hidden="true">
                          {track.title.slice(0, 1)}
                        </span>
                        <h3>{track.title}</h3>
                        <span className={styles.trackTableStatus} data-status={status}>
                          {trackStatusLabels[status]}
                        </span>
                      </div>
                      {track.percent !== null ? (
                        <ProgressBar percent={track.percent} label={`${track.title} 진행률 ${track.percent}퍼센트`} />
                      ) : null}
                      {track.actionHref ? (
                        <Link to={track.actionHref}>{track.actionLabel}</Link>
                      ) : null}
                    </div>
                    <span role="cell">{track.percent !== null ? `${track.percent}%` : '준비 중'}</span>
                    <span role="cell">{track.testResultLabel}</span>
                  </div>
                )
              })}
            </div>
          </section>

          <section className={styles.workspacePreviewCard} aria-labelledby="workspace-preview-title">
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
              <p className={styles.workspacePreviewBanner} data-passed={activeMissionTestResult.passed === activeMissionTestResult.total}>
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

        <div className={styles.calendarRow}>
          <section className={styles.calendarCard} aria-labelledby="calendar-title">
            <div className={styles.panelTitleRow}>
              <h2 id="calendar-title">{monthLabel}</h2>
              <div className={styles.arrowGroup} aria-hidden="true">
                <span>‹</span>
                <span>›</span>
              </div>
            </div>
            <div className={styles.weekGrid} aria-hidden="true">
              {weekLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className={styles.calendarGrid}>
              {calendarDays.map((item) => (
                <span
                  className={item.day === now.getDate() ? styles.selectedDay : undefined}
                  key={item.key}
                >
                  {item.day ?? ''}
                </span>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
