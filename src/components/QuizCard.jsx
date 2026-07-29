import { useEffect, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import Card from './Card.jsx'
import ProgressBarFill from './ProgressBarFill.jsx'
import { playConfetti } from '../lib/confetti.js'
import { buildQuizChoices, pickTodayQuizFood } from '../lib/calorieQuiz.js'
import { claimQuest, getClaimedQuestIds } from '../lib/dataStore.js'
import { logicalDateKey } from '../lib/logicalDate.js'
import { fetchCalorieNeighbors } from '../lib/quizApi.js'
import { QUIZ_FOOD_POOL } from '../lib/quizFoodPool.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

const QUIZ_XP = 15
const TIMER_MS = 10000
const FEEDBACK_MS = 1200

// MY 탭 — 식단 퀴즈 & 밸런스게임(FR-17). 오늘의 대상 음식(quizFoodPool.js)을 결정적으로 골라
// "○○ 1인분과 칼로리가 비슷한 음식은?" 10초 제한 4지선다를 낸다. 정답이면 하루 1회 quest_claims에
// 'special-quiz'로 기록하고(quest_claims의 (user_id,date,quest_id) 유니크 제약이 "하루 1회"를
// 공짜로 보장) XP를 지급한다. 오답/시간초과는 페널티 없이 다시 도전할 수 있다(claimQuest를 호출하지
// 않으므로 "오늘 시도를 소진"시키지 않음 — FR-16의 week-quiz-N 주간 퀘스트가 이 클레임 여부로
// "이번 주 퀴즈 정답 일수"를 센다).
export default function QuizCard() {
  const { effectiveUserId } = useUser()
  const [state, setState] = useState('loading') // loading | ready | answered | completed | unavailable
  const [quiz, setQuiz] = useState(null) // { food, dateKey, choices, correctIndex }
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [barPercent, setBarPercent] = useState(100)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const dateKey = logicalDateKey(new Date())
      const claimed = await getClaimedQuestIds(dateKey).catch(() => [])
      if (cancelled) return
      if (claimed.includes('special-quiz')) {
        setState('completed')
        return
      }
      const food = pickTodayQuizFood(QUIZ_FOOD_POOL, effectiveUserId, dateKey)
      if (!food) {
        setState('unavailable')
        return
      }
      const data = await fetchCalorieNeighbors(food)
      if (cancelled) return
      const built = data ? buildQuizChoices(data.neighbors, data.farOptions, `${effectiveUserId}:${dateKey}`) : null
      if (!built) {
        setState('unavailable')
        return
      }
      setQuiz({ food: data.targetFood, dateKey, ...built })
      setSelectedIndex(null)
      setState('ready')
    }
    init()
    return () => {
      cancelled = true
    }
  }, [effectiveUserId])

  // 10초 카운트다운은 JS 인터벌이 아니라 CSS transition으로 그린다(프로젝트 모션 규칙 —
  // transform만 애니메이션). 마운트 직후 100%에서 다음 틱에 0%로 값을 바꿔 10초짜리 transition이
  // 걸리게 하고, 실제 "시간 초과" 판정은 별도 setTimeout 하나로 처리한다.
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

  if (state === 'loading' || state === 'unavailable') return null

  return (
    <Card>
      <h3 style={{ margin: `0 0 ${spacing.sm}px`, fontSize: font.size.md, fontWeight: 700, color: colors.textStrong }}>
        오늘의 식단 퀴즈
      </h3>

      {state === 'completed' ? (
        <p style={{ margin: 0, fontSize: font.size.sm, color: colors.textSub }}>
          오늘의 퀴즈를 완료했어요! 내일 새 문제로 만나요.
        </p>
      ) : (
        <>
          <p style={{ margin: `0 0 ${spacing.md}px`, fontSize: font.size.sm, color: colors.textSub }}>
            <strong style={{ color: colors.textStrong }}>{quiz.food}</strong> 1인분과 칼로리가 비슷한 음식은?
          </p>
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
