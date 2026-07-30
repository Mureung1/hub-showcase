import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import ProgressBarFill from '../components/ProgressBarFill.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import { useUser } from '../context/UserContext.jsx'
import { playConfetti } from '../lib/confetti.js'
import { claimQuest, getClaimedQuestIds } from '../lib/dataStore.js'
import { logicalDateKey, logicalWeekKey } from '../lib/logicalDate.js'
import { pickTodayTrivia } from '../lib/nutritionTrivia.js'
import { NUTRITION_TRIVIA_POOL } from '../lib/nutritionTriviaPool.js'
import { getWeekQuizStreak } from '../lib/questWeekContext.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

const QUIZ_XP = 15
const TIMER_MS = 10000
const FEEDBACK_MS = 1200
const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

// MY 탭 개편 — 예전 QuizCard.jsx(MY 탭 임베드 카드)를 전용 화면으로 승격했다. 퀴즈 상태머신은 그대로
// 옮겼고(시작 버튼을 눌러야 문제+10초 타이머가 시작되는 동작 불변), 이 화면만의 추가 요소는 "이번 주
// 참여" 월~일 점 7개 + 연속 정답 일수(questWeekContext.getWeekQuizStreak, 신규) — 정답을 새로 맞히면
// (state가 completed로 바뀌면) 다시 불러와 갱신한다.
export default function MyQuizPage() {
  const navigate = useNavigate()
  const { effectiveUserId } = useUser()
  const [state, setState] = useState('checking') // checking | idle | ready | answered | completed | unavailable
  const [quiz, setQuiz] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [barPercent, setBarPercent] = useState(100)
  const [weekStreak, setWeekStreak] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const dateKey = logicalDateKey(new Date())
      const claimed = await getClaimedQuestIds(dateKey).catch(() => [])
      if (cancelled) return
      setState(claimed.includes('special-quiz') ? 'completed' : 'idle')
    }
    init()
    return () => {
      cancelled = true
    }
  }, [effectiveUserId])

  useEffect(() => {
    let cancelled = false
    const now = new Date()
    getWeekQuizStreak(logicalWeekKey(now), logicalDateKey(now))
      .then((result) => {
        if (!cancelled) setWeekStreak(result)
      })
      .catch(() => {
        if (!cancelled) setWeekStreak(null)
      })
    return () => {
      cancelled = true
    }
    // state를 의존성에 넣어 정답을 맞혀 completed가 될 때마다 오늘 점을 다시 채운다.
  }, [effectiveUserId, state])

  function handleStart() {
    const dateKey = logicalDateKey(new Date())
    const trivia = pickTodayTrivia(NUTRITION_TRIVIA_POOL, effectiveUserId, dateKey)
    if (!trivia) {
      setState('unavailable')
      return
    }
    setQuiz({ ...trivia, dateKey })
    setSelectedIndex(null)
    setState('ready')
  }

  useEffect(() => {
    if (state !== 'ready') return undefined
    setBarPercent(100)
    const fillTimer = setTimeout(() => setBarPercent(0), 30)
    const timeoutTimer = setTimeout(() => {
      setSelectedIndex(-1)
      setState('answered')
      setTimeout(() => {
        setSelectedIndex(null)
        setState('ready')
      }, FEEDBACK_MS)
    }, TIMER_MS)
    return () => {
      clearTimeout(fillTimer)
      clearTimeout(timeoutTimer)
    }
  }, [state, quiz])

  async function handleSelect(index) {
    if (state !== 'ready' || !quiz) return
    setSelectedIndex(index)
    setState('answered')

    if (index === quiz.correctIndex) {
      try {
        await claimQuest({ dateKey: quiz.dateKey, questId: 'special-quiz', xpAwarded: QUIZ_XP })
        playConfetti()
      } catch {
        // 조용히 실패 — 다음 방문 때 다시 시도할 수 있다(장식적 부가 기능).
      }
      setTimeout(() => setState('completed'), FEEDBACK_MS)
    } else {
      setTimeout(() => {
        setSelectedIndex(null)
        setState('ready')
      }, FEEDBACK_MS)
    }
  }

  return (
    <div style={styles.page}>
      <ScreenHeader title="오늘의 식단 퀴즈" onBack={() => navigate('/profile')} />

      {state === 'unavailable' && (
        <Card>
          <p style={{ margin: 0, fontSize: font.size.sm, color: colors.textSub }}>지금은 퀴즈를 준비할 수 없어요.</p>
        </Card>
      )}

      {state !== 'checking' && state !== 'unavailable' && (
        <Card style={{ marginBottom: spacing.lg }}>
          {state === 'completed' ? (
            <p style={{ margin: 0, fontSize: font.size.sm, color: colors.textSub }}>
              오늘의 퀴즈를 완료했어요! 내일 새 문제로 만나요.
            </p>
          ) : state === 'idle' ? (
            <>
              <p style={{ margin: `0 0 ${spacing.md}px`, fontSize: font.size.sm, color: colors.textSub }}>
                10초 안에 맞히면 XP를 받아요. 준비되면 시작해보세요!
              </p>
              <AppButton onClick={handleStart}>퀴즈 시작</AppButton>
            </>
          ) : (
            quiz && (
              <>
                <p style={{ margin: `0 0 ${spacing.md}px`, fontSize: font.size.sm, color: colors.textStrong, fontWeight: 600 }}>
                  {quiz.question}
                </p>
                <div style={{ height: 6, borderRadius: radius.pill, background: colors.track, overflow: 'hidden', marginBottom: spacing.md }}>
                  <ProgressBarFill
                    percent={barPercent}
                    color={colors.primary}
                    style={{ transition: state === 'ready' ? `transform ${TIMER_MS}ms linear` : 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                  {quiz.choices.map((choice, i) => {
                    const revealed = state === 'answered'
                    const isCorrect = i === quiz.correctIndex
                    const isSelected = selectedIndex === i
                    let background = colors.bg
                    let color = colors.textStrong
                    if (revealed && isCorrect) {
                      background = colors.successSurface
                      color = colors.success
                    } else if (revealed && isSelected) {
                      background = colors.dangerSurface
                      color = colors.danger
                    }
                    return (
                      <button
                        key={choice}
                        type="button"
                        className="tds-press"
                        onClick={() => handleSelect(i)}
                        disabled={state !== 'ready'}
                        style={{
                          padding: `${spacing.sm}px ${spacing.md}px`,
                          borderRadius: radius.md,
                          border: 'none',
                          background,
                          color,
                          fontWeight: 600,
                          fontSize: font.size.sm,
                          textAlign: 'left',
                          cursor: state === 'ready' ? 'pointer' : 'default',
                        }}
                      >
                        {choice}
                      </button>
                    )
                  })}
                </div>
              </>
            )
          )}
        </Card>
      )}

      {weekStreak && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <h3 style={{ margin: 0, fontSize: font.size.sm, fontWeight: 700, color: colors.textStrong }}>이번 주 참여</h3>
            <span style={{ fontSize: font.size.xs, color: colors.primary, fontWeight: 700 }}>{weekStreak.streak}일 연속</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {weekStreak.days.map((day, i) => (
              <div key={day.dateKey} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xs }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: day.success ? colors.primary : day.isFuture ? colors.bg : colors.border,
                    border: day.isFuture ? `1px solid ${colors.border}` : 'none',
                  }}
                />
                <span style={{ fontSize: font.size.xs, color: colors.textSub }}>{WEEKDAY_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
