import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { shouldUseServerApi } from '../../app/icuApiMode'
import {
  createFallbackCurriculumPlan,
  getGeneratedCurriculum,
  recommendCurriculum,
  resetGeneratedCurriculumApi,
  saveGeneratedCurriculumApi,
} from '../curriculum/api/curriculumClient'
import {
  learningTracks,
  recentMistakes,
  reviewSummaryItems,
  todayQueue,
  type LearningTrackStatus,
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
import { CurriculumLoading } from './CurriculumLoading'
import { getTodayProgress } from '../learning-progress/api/learningProgressClient'
import { useMistakeNoteStore } from '../mistake-notes/model/useMistakeNoteStore'
import styles from './TodayLearningHub.module.css'

type CurriculumMode = 'docs' | 'ai'
type GenerationStatus = 'idle' | 'generating' | 'ready'

const defaultCareerGoal = 'DEVOPS 엔지니어가 되고 싶어'

const trackStatusLabels: Record<LearningTrackStatus, string> = {
  in_progress: '진행 중',
  review_due: '복습 필요',
  completed: '완료',
  not_started: '시작 전',
}

const queueStatusLabels: Record<TodayQueueStatus, string> = {
  done: '완료',
  current: '현재',
  locked: '대기',
  optional: '선택',
}

const docsCurriculum = [
  { title: 'React 공식 문서', detail: 'State: A Component Memory', progress: '62%' },
  { title: '이벤트 처리', detail: 'Responding to Events', progress: '38%' },
  { title: 'Counter.jsx 실습', detail: 'state와 onClick 연결', progress: '진행' },
]

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

function formatGeneratedAt(value: string | undefined) {
  if (!value) {
    return '아직 저장 전'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '저장 시각 확인 필요'
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function TodayLearningHub() {
  const { profile } = useLearningProfileStore()
  const generatedCurriculum = useGeneratedCurriculumStore((state) => state.generatedCurriculum)
  const saveGeneratedCurriculum = useGeneratedCurriculumStore(
    (state) => state.saveGeneratedCurriculum,
  )
  const hydrateGeneratedCurriculum = useGeneratedCurriculumStore(
    (state) => state.hydrateGeneratedCurriculum,
  )
  const resetGeneratedCurriculum = useGeneratedCurriculumStore(
    (state) => state.resetGeneratedCurriculum,
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
  const [curriculumMode, setCurriculumMode] = useState<CurriculumMode>('ai')
  const [careerGoal, setCareerGoal] = useState(generatedCurriculum?.goal ?? profileGoal)
  const [followUpText, setFollowUpText] = useState('')
  const [goalError, setGoalError] = useState('')
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('ready')
  const activeTrackName = profile?.preferredTracks[0] ?? 'React'
  const displayName = profile?.displayName ?? '학습자'
  const dailyMinutes = profile?.dailyStudyMinutes ?? 30
  const savedGoal = generatedCurriculum?.goal ?? generatedPlan.goal
  const isGoalDraftChanged = careerGoal.trim().length > 0 && careerGoal.trim() !== savedGoal
  const isGenerating = generationStatus === 'generating'
  const generatedAtLabel = formatGeneratedAt(generatedCurriculum?.generatedAt)
  const generatedStateLabel = generatedCurriculum
    ? '최근 생성한 커리큘럼'
    : '프로필 기준 기본 커리큘럼'

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
            setCareerGoal(serverSnapshot.goal)
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
        value: String(profile?.preferredTracks.length ?? learningTracks.length).padStart(2, '0'),
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

  function startCurriculumGeneration(goal: string, followUpInstruction?: string) {
    const trimmedGoal = goal.trim()
    const trimmedFollowUp = followUpInstruction?.trim()

    if (!trimmedGoal) {
      setGoalError('목표를 입력하면 AI가 학습 순서를 제안합니다.')
      setGenerationStatus('idle')
      return
    }

    setGoalError('')
    setGenerationStatus('generating')

    void recommendCurriculum(
      {
        goal: trimmedGoal,
        followUpInstruction: trimmedFollowUp || undefined,
        previousPlan: generatedCurriculum?.plan,
      },
      { mode: shouldUseServerApi() ? 'server' : 'mock' },
    )
      .then(({ plan }) => {
        setCareerGoal(trimmedGoal)
        saveGeneratedCurriculum(trimmedGoal, plan)
        if (shouldUseServerApi()) {
          void saveGeneratedCurriculumApi(
            { goal: trimmedGoal, plan, generatedAt: new Date().toISOString() },
            { mode: 'server' },
          ).catch(() => {})
        }
        setGenerationStatus('ready')
      })
      .catch(() => {
        setGoalError('커리큘럼을 생성하지 못했습니다. 잠시 후 다시 시도해보세요.')
        setGenerationStatus('idle')
      })
  }

  function handleGenerateCurriculum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startCurriculumGeneration(careerGoal)
  }

  function handleFollowUpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!followUpText.trim()) return
    startCurriculumGeneration(careerGoal, followUpText)
    setFollowUpText('')
  }

  function handleResetGeneratedCurriculum() {
    resetGeneratedCurriculum()
    if (shouldUseServerApi()) {
      void resetGeneratedCurriculumApi({ mode: 'server' }).catch(() => {})
    }
    setCareerGoal(profileGoal)
    setGoalError('')
    setGenerationStatus('ready')
  }

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
          <Link className={styles.profileLink} to="/profile">
            프로필 조정
          </Link>
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

        <div className={styles.layoutGrid}>
          <section className={styles.mainColumn}>
            <section className={styles.welcomeCard} aria-labelledby="welcome-title">
              <div className={styles.welcomeCopy}>
                <p>Welcome To</p>
                <h2 id="welcome-title">오늘 학습을 시작해볼까요?</h2>
                <span>
                  {displayName}님, 오늘은 {activeTrackName} 중심으로 {dailyMinutes}분 학습을
                  이어갑니다.
                </span>
                <Link to="/workspace?mission=generated-first-mission">학습 시작</Link>
              </div>
              <div className={styles.welcomeVisual} aria-label="오늘의 미션 미리보기">
                <strong>{generatedPlan.todayMission.fileName}</strong>
                <code>{generatedPlan.todayMission.title}</code>
                <span>{generatedPlan.todayMission.detail}</span>
              </div>
            </section>

            <section className={styles.statsGrid} aria-label="오늘 학습 요약">
              {stats.map((stat) => (
                <article className={styles.statCard} data-tone={stat.tone} key={stat.label}>
                  <span aria-hidden="true" />
                  <strong>{stat.value}</strong>
                  <p>{stat.label}</p>
                </article>
              ))}
            </section>

            <section className={styles.curriculumPanel} aria-labelledby="curriculum-title">
              <div className={styles.panelTitleRow}>
                <div>
                  <h2 id="curriculum-title">커리큘럼 만들기</h2>
                  <p>문서를 따라가거나, 목표를 입력해 코듀가 학습 순서를 짜게 합니다.</p>
                </div>
                <div className={styles.tabs} role="tablist" aria-label="커리큘럼 작성 방식">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={curriculumMode === 'docs'}
                    className={curriculumMode === 'docs' ? styles.activeTab : undefined}
                    onClick={() => setCurriculumMode('docs')}
                  >
                    문서 기반
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={curriculumMode === 'ai'}
                    className={curriculumMode === 'ai' ? styles.activeTab : undefined}
                    onClick={() => setCurriculumMode('ai')}
                  >
                    AI 커리큘럼 작성하기
                  </button>
                  <Link to="/curriculum/history" className={styles.historyTabLink}>
                    보관함 관리
                  </Link>
                </div>
              </div>

              {curriculumMode === 'docs' ? (
                <div className={styles.docsCurriculum} role="tabpanel">
                  {docsCurriculum.map((item) => (
                    <article key={item.title}>
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.detail}</p>
                      </div>
                      <strong>{item.progress}</strong>
                    </article>
                  ))}
                </div>
              ) : (
                <div
                  className={styles.aiCurriculum}
                  role="tabpanel"
                  aria-busy={generationStatus === 'generating'}
                >
                  <form className={styles.goalInputRow} onSubmit={handleGenerateCurriculum}>
                    <label>
                      <span>되고 싶은 목표</span>
                      <input
                        value={careerGoal}
                        aria-invalid={Boolean(goalError)}
                        aria-describedby={goalError ? 'curriculum-goal-error' : undefined}
                        onChange={(event) => setCareerGoal(event.target.value)}
                      />
                    </label>
                    <button type="submit" disabled={generationStatus === 'generating'}>
                      {generationStatus === 'generating' ? '작성 중' : '코듀로 작성'}
                    </button>
                  </form>
                  {goalError ? (
                    <p className={styles.validationMessage} id="curriculum-goal-error">
                      {goalError}
                    </p>
                  ) : null}
                  {generationStatus === 'generating' ? (
                    <CurriculumLoading />
                  ) : (
                    <>
                      <section
                        className={styles.generatedSummary}
                        aria-label="최근 생성한 커리큘럼"
                      >
                        <div>
                          <span>{generatedStateLabel}</span>
                          <strong>{generatedPlan.title}</strong>
                          <p>
                            {generatedAtLabel} · {generatedPlan.todayMission.fileName}
                          </p>
                        </div>
                        <div className={styles.generatedActions}>
                          <Link
                            className={styles.generatedStartLink}
                            to="/workspace?mission=generated-first-mission"
                          >
                            추천 미션 시작
                          </Link>
                          {isGoalDraftChanged ? (
                            <span className={styles.pendingNotice}>
                              입력한 목표가 아직 적용되지 않았습니다.
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => startCurriculumGeneration(careerGoal)}
                          >
                            다시 생성
                          </button>
                          <button
                            type="button"
                            disabled={!generatedCurriculum}
                            onClick={handleResetGeneratedCurriculum}
                          >
                            초기화
                          </button>
                        </div>
                      </section>
                      <div className={styles.followUpSection}>
                        <div className={styles.quickChips} aria-label="추천 후속 질문">
                          <button
                            type="button"
                            onClick={() =>
                              startCurriculumGeneration(careerGoal, '3주 커리큘럼으로 수정해줘')
                            }
                          >
                            3주 코스로 변경
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              startCurriculumGeneration(
                                careerGoal,
                                '어제 공부한 내용에 이어서 다음 단계를 추천해줘',
                              )
                            }
                          >
                            어제 내용 이어서
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              startCurriculumGeneration(careerGoal, '실습 30분 위주로 구성해줘')
                            }
                          >
                            실습 중심 구성
                          </button>
                        </div>
                        <form className={styles.followUpRow} onSubmit={handleFollowUpSubmit}>
                          <input
                            type="text"
                            placeholder="후속 요청 입력 (예: 3주 과정으로 수정, 어제 내용 이어서)"
                            value={followUpText}
                            onChange={(event) => setFollowUpText(event.target.value)}
                          />
                          <button type="submit" disabled={isGenerating || !followUpText.trim()}>
                            {isGenerating ? '수정 중' : '후속 요청'}
                          </button>
                        </form>
                      </div>
                      <div className={styles.aiPlanHeader} data-status={generationStatus}>
                        <strong>{generatedPlan.title}</strong>
                        <span>{generatedPlan.summary}</span>
                        <small>
                          {generatedPlan.estimatedDuration} / {generatedPlan.focusRole}
                        </small>
                      </div>
                      <ol className={styles.aiPlanList}>
                        {generatedPlan.steps.map((item, index) => (
                          <li key={item.id}>
                            <span>{String(index + 1).padStart(2, '0')}</span>
                            <div>
                              <strong>{item.title}</strong>
                              <p>{item.detail}</p>
                              <small>
                                {item.durationLabel} · {item.outcome}
                              </small>
                            </div>
                          </li>
                        ))}
                      </ol>
                      <div className={styles.sourceList} aria-label="추천 문서">
                        {generatedPlan.sources.map((source) => (
                          <article key={source.title}>
                            <strong>{source.title}</strong>
                            <span>{source.urlLabel}</span>
                          </article>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>

            <div className={styles.analyticsGrid}>
              <section className={styles.chartPanel} aria-labelledby="work-title">
                <div className={styles.panelTitleRow}>
                  <h2 id="work-title">학습 진행</h2>
                  <button type="button">Weekly</button>
                </div>
                <div className={styles.lineChart} aria-label="주간 학습량 차트">
                  <span>72 task</span>
                  <i />
                </div>
              </section>

              <section className={styles.ringPanel} aria-labelledby="percent-title">
                <h2 id="percent-title">목표 달성률</h2>
                <div className={styles.ringWrap}>
                  <div
                    className={styles.ring}
                    aria-label={`오늘 학습 진행률 ${completionPercent}퍼센트`}
                  />
                  <ul>
                    <li>
                      <span /> 완료 {completionPercent}%
                    </li>
                    <li>
                      <span /> 진행 30%
                    </li>
                    <li>
                      <span /> 대기 8%
                    </li>
                  </ul>
                </div>
              </section>
            </div>

            <section className={styles.trackSection} aria-labelledby="tracks-title">
              <div className={styles.panelTitleRow}>
                <h2 id="tracks-title">학습 목록</h2>
                <Link to="/workspace?mission=generated-first-mission">워크스페이스로 이동</Link>
              </div>
              <div className={styles.trackList}>
                {learningTracks.map((track) => (
                  <article className={styles.trackCard} key={track.id}>
                    <span data-status={track.status}>{trackStatusLabels[track.status]}</span>
                    <div>
                      <h3>{track.title}</h3>
                      <p>{track.nextAction}</p>
                    </div>
                    <strong>{track.progress}%</strong>
                  </article>
                ))}
              </div>
            </section>
          </section>

          <aside className={styles.sideColumn} aria-label="오늘 일정과 학습 큐">
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

            <section className={styles.upcomingCard} aria-labelledby="queue-title">
              <div className={styles.panelTitleRow}>
                <h2 id="queue-title">오늘 학습 큐</h2>
                <span>총 {totalQueueMinutes}분</span>
              </div>
              <ol className={styles.timelineList}>
                {displayQueue.map((item) => (
                  <li data-status={item.status} key={item.id}>
                    <time>{item.durationMinutes}분</time>
                    <Link to={'/workspace?mission=' + item.id}>
                      <span>{queueStatusLabels[item.status]}</span>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                    </Link>
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
          </aside>
        </div>
      </section>
    </main>
  )
}
