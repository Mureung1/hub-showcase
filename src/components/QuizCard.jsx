import { useEffect, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import AppButton from './AppButton.jsx'
import Card from './Card.jsx'
import ProgressBarFill from './ProgressBarFill.jsx'
import { playConfetti } from '../lib/confetti.js'
import { claimQuest, getClaimedQuestIds } from '../lib/dataStore.js'
import { logicalDateKey } from '../lib/logicalDate.js'
import { pickTodayTrivia } from '../lib/nutritionTrivia.js'
import { NUTRITION_TRIVIA_POOL } from '../lib/nutritionTriviaPool.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

const QUIZ_XP = 15
const TIMER_MS = 10000
const FEEDBACK_MS = 1200

// MY 탭 — 식단 퀴즈 & 밸런스게임(FR-17, 리텐션 강화 v4에서 상식 퀴즈로 전면 교체). 예전엔 MY 탭에
// 들어오는 즉시 문제를 불러오고 10초 타이머가 바로 돌았지만, 지금은 "퀴즈 시작" 버튼을 눌러야만
// 문제가 나오고 그때부터 타이머가 돈다. 정답이면 하루 1회 quest_claims에 'special-quiz'로 기록하고
// (quest_claims의 (user_id,date,quest_id) 유니크 제약이 "하루 1회"를 공짜로 보장) XP를 지급한다.
// 오답/시간초과는 페널티 없이 다시 도전할 수 있다(claimQuest를 호출하지 않으므로 "오늘 시도를
// 소진"시키지 않음 — FR-16의 week-quiz-N 주간 퀘스트가 이 클레임 여부로 "이번 주 퀴즈 정답 일수"를 센다).
export default function QuizCard() {
  const { effectiveUserId } = useUser()
  const [state, setState] = useState('checking') // checking | idle | ready | answered | completed | unavailable
  const [quiz, setQuiz] = useState(null) // { id, question, choices, correctIndex, dateKey }
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [barPercent, setBarPercent] = useState(100)

  // 마운트 시엔 오늘 이미 완료했는지만 확인한다(문제 선택/타이머는 시작 버튼을 눌러야 시작).
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

  // 10초 카운트다운은 JS 인터벌이 아니라 CSS transition으로 그린다(프로젝트 모션 규칙 —
  // transform만 애니메이션). "ready"가 되는 순간(=시작 버튼을 누른 순간)에만 걸리고, 마운트 시점엔
  // 걸리지 않는다.
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

  if (state === 'checking' || state === 'unavailable') return null

  return (
    <Card>
      <h3 style={{ margin: `0 0 ${spacing.sm}px`, fontSize: font.size.md, fontWeight: 700, color: colors.textStrong }}>
        오늘의 식단 퀴즈
      </h3>

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
        <>
          <p style={{ margin: `0 0 ${spacing.md}px`, fontSize: font.size.sm, color: colors.textStrong, fontWeight: 600 }}>{quiz.question}</p>
          <div
            style={{
              height: 6,
              borderRadius: radius.pill,
              background: colors.track,
              overflow: 'hidden',
              marginBottom: spacing.md,
            }}
          >
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
      )}
    </Card>
  )
}
