import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { generateMockCurriculum, type GeneratedCurriculumPlan } from '../../data/curriculumGenerator'
import {
  learningTracks,
  recentMistakes,
  reviewSummaryItems,
  todayQueue,
  type LearningTrackStatus,
  type TodayQueueItem,
  type TodayQueueStatus,
} from '../../data/todayLearning'
import { useLearningProfileStore } from '../../stores/useLearningProfileStore'
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

export function TodayLearningHub() {
  const { profile } = useLearningProfileStore()
  const profileGoal = profile?.learningGoal ?? defaultCareerGoal
  const [curriculumMode, setCurriculumMode] = useState<CurriculumMode>('ai')
  const [careerGoal, setCareerGoal] = useState(profileGoal)
  const [goalError, setGoalError] = useState('')
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('ready')
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedCurriculumPlan>(() =>
    generateMockCurriculum(profileGoal),
  )
  const generationTimerRef = useRef<number | undefined>(undefined)
  const syncedProfileGoalRef = useRef(profileGoal)
  const activeTrackName = profile?.preferredTracks[0] ?? 'React'
  const displayName = profile?.displayName ?? '학습자'
  const dailyMinutes = profile?.dailyStudyMinutes ?? 30

  useEffect(() => {
    return () => {
      if (generationTimerRef.current) {
        window.clearTimeout(generationTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (syncedProfileGoalRef.current === profileGoal) {
      return
    }

    syncedProfileGoalRef.current = profileGoal
    setCareerGoal(profileGoal)
    setGoalError('')
    setGenerationStatus('ready')
    setGeneratedPlan(generateMockCurriculum(profileGoal))
  }, [profileGoal])

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
  const totalQueueMinutes = useMemo(
    () => generatedQueue.reduce((total, item) => total + item.durationMinutes, 0),
    [generatedQueue],
  )
  const stats = useMemo(
    () => [
      { label: '오늘 학습', value: dailyMinutes + '분', tone: 'blue' },
      {
        label: '진행 트랙',
        value: String(profile?.preferredTracks.length ?? learningTracks.length).padStart(2, '0'),
        tone: 'cyan',
      },
      { label: '큐 총합', value: totalQueueMinutes + '분', tone: 'peach' },
      { label: '완료율', value: '62%', tone: 'green' },
    ],
    [dailyMinutes, profile?.preferredTracks.length, totalQueueMinutes],
  )

  function handleGenerateCurriculum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedGoal = careerGoal.trim()

    if (!trimmedGoal) {
      setGoalError('목표를 입력하면 AI가 학습 순서를 제안합니다.')
      setGenerationStatus('idle')
      return
    }

    setGoalError('')
    setGenerationStatus('generating')

    if (generationTimerRef.current) {
      window.clearTimeout(generationTimerRef.current)
    }

    generationTimerRef.current = window.setTimeout(() => {
      setGeneratedPlan(generateMockCurriculum(trimmedGoal))
      setGenerationStatus('ready')
    }, 420)
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
                  <h2 id="curriculum-title">커리큘럼 작성</h2>
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
                          <small>{item.durationLabel} · {item.outcome}</small>
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
                  <div className={styles.ring} aria-label="오늘 학습 진행률 62퍼센트" />
                  <ul>
                    <li><span /> 완료 62%</li>
                    <li><span /> 진행 30%</li>
                    <li><span /> 대기 8%</li>
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
                {generatedQueue.map((item) => (
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
                <Link to="/workspace?mission=ai-review">복습 시작</Link>
              </div>
              <ul>
                {[...reviewSummaryItems, ...recentMistakes].map((item) => (
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
