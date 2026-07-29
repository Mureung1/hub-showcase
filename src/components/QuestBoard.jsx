import { useCallback, useEffect, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import Card from './Card.jsx'
import { claimQuest, getClaimedQuestIds, getMealsByDateRange } from '../lib/dataStore.js'
import { applyStreakBonus } from '../lib/levelSystem.js'
import { logicalDateKey, logicalWeekKey } from '../lib/logicalDate.js'
import { sumMealRecordsNutrients } from '../lib/mealStore.js'
import { isMet } from '../lib/nutrientCriteria.js'
import {
  buildItemFlags,
  buildWeeklyStats,
  findNewlyCompletedAutoQuests,
  getQuestBoard,
  resolveAllClearBonuses,
  selectDailyQuests,
  selectWeeklyQuests,
} from '../lib/quests.js'
import { toDateKey } from '../lib/records.js'
import { calcStreak } from '../lib/streak.js'
import { getWaterIntake, getWaterTargetMl } from '../lib/waterIntake.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// StreakBadge.jsx와 동일한 조회 범위 — 스트릭 계산에 필요한 것 이상은 과하다.
const LOOKBACK_DAYS = 90

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

// streak.js의 내부 dateKeyToDayNumber와 동일한 방식(UTC 정수 산술) — 주간 연속기록 계산에만 쓰는
// 로컬 헬퍼라 streak.js를 export 확장하는 대신 여기서 다시 만든다(기존 daysAgo 중복 정의와 같은 결).
function dateKeyToDayNumber(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
}

// weekKey(그 주의 월요일, YYYY-MM-DD)로부터 월~일 7개 날짜 키를 만든다.
function weekDateKeys(weekKey) {
  const [y, m, d] = weekKey.split('-').map(Number)
  const monday = new Date(y, m - 1, d)
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    return toDateKey(day)
  })
}

// MY 탭 — 퀘스트 게시판(FR-11, 일간/주간 로테이션 FR-16). 오늘의 미션(missions.js, 하루 1개·이력
// 없음)과 달리 일간 3개+주간 3개를 동시에 보여주고, 완료(수령)를 dataStore.claimQuest로 영구
// 저장한다. 모든 퀘스트가 자동 판정+자동 수령이라(FR-16에서 수동 클레임 버튼 제거) 마운트 시 이
// 컴포넌트가 조건을 만족한 퀘스트를 조용히 수령하는 것이 유일한 지급 경로 중 하나다(다른 하나는
// 끼니 저장 직후 Analyze.jsx의 runGamification — 애니메이션과 함께 지급).
export default function QuestBoard() {
  const { effectiveUserId, todayMeals, todayMealsTotal, effectiveRecommended, profile } = useUser()
  const [board, setBoard] = useState(null)

  const buildContext = useCallback(async () => {
    const now = new Date()
    const dateKey = logicalDateKey(now)
    const weekKey = logicalWeekKey(now)
    const todayCalendarKey = toDateKey(now)
    const startKey = toDateKey(daysAgo(LOOKBACK_DAYS))
    const byDate = await getMealsByDateRange(startKey, todayCalendarKey)
    const streak = calcStreak(Object.keys(byDate), todayCalendarKey)

    const targetMl = getWaterTargetMl(profile?.weightKg, profile?.activity)
    const water = getWaterIntake(effectiveUserId, todayCalendarKey)
    const itemFlags = buildItemFlags(todayMeals)

    const days = []
    for (const dayKey of weekDateKeys(weekKey).filter((k) => k <= todayCalendarKey)) {
      const meals = byDate[dayKey] ?? []
      const mealCount = meals.length
      const types = new Set(meals.map((m) => m.mealType))
      const total = sumMealRecordsNutrients(meals)
      const dayWater = getWaterIntake(effectiveUserId, dayKey)
      // eslint-disable-next-line no-await-in-loop
      const dayClaimed = await getClaimedQuestIds(dayKey)
      days.push({
        dayNumber: dateKeyToDayNumber(dayKey),
        mealCount,
        threeMeals: ['breakfast', 'lunch', 'dinner'].every((t) => types.has(t)),
        sodiumOk: mealCount > 0 && isMet('sodium', total.sodium, effectiveRecommended?.sodium),
        waterMet: dayWater.mlConsumed >= targetMl * 0.8,
        supplementTaken: dayWater.supplementTaken,
        quizSuccess: dayClaimed.includes('special-quiz'),
      })
    }

    const ctx = {
      mealCount: todayMeals?.length ?? 0,
      todayTotal: todayMealsTotal,
      recommended: effectiveRecommended,
      mealTypesToday: new Set((todayMeals ?? []).map((m) => m.mealType)),
      streakCurrent: streak.current,
      waterMlConsumed: water.mlConsumed,
      waterTargetMl: targetMl,
      supplementTaken: water.supplementTaken,
      ...itemFlags,
      ...buildWeeklyStats(days),
    }
    return { ctx, dateKey, weekKey, streak }
  }, [effectiveUserId, todayMeals, todayMealsTotal, effectiveRecommended, profile])

  const refresh = useCallback(async () => {
    try {
      const { ctx, dateKey, weekKey, streak } = await buildContext()
      let dailyClaimedIds = await getClaimedQuestIds(dateKey)
      let weeklyClaimedIds = await getClaimedQuestIds(weekKey)

      const newlyCompleted = findNewlyCompletedAutoQuests(ctx, {
        dateKey,
        weekKey,
        userId: effectiveUserId,
        dailyClaimedIds,
        weeklyClaimedIds,
      })
      for (const quest of newlyCompleted) {
        const xpAwarded = applyStreakBonus(quest.xp, streak.current)
        const claimDateKey = quest.period === 'weekly' ? weekKey : dateKey
        // eslint-disable-next-line no-await-in-loop
        await claimQuest({ dateKey: claimDateKey, questId: quest.id, xpAwarded })
        if (quest.period === 'weekly') weeklyClaimedIds = [...weeklyClaimedIds, quest.id]
        else dailyClaimedIds = [...dailyClaimedIds, quest.id]
      }

      const dailyQuests = selectDailyQuests(dateKey, effectiveUserId)
      const weeklyQuests = selectWeeklyQuests(weekKey, effectiveUserId)
      const bonuses = resolveAllClearBonuses({ dailyQuests, dailyClaimedIds, weeklyQuests, weeklyClaimedIds })
      for (const bonus of bonuses) {
        const xpAwarded = applyStreakBonus(bonus.xp, streak.current)
        const claimDateKey = bonus.period === 'weekly' ? weekKey : dateKey
        // eslint-disable-next-line no-await-in-loop
        await claimQuest({ dateKey: claimDateKey, questId: bonus.id, xpAwarded })
        if (bonus.period === 'weekly') weeklyClaimedIds = [...weeklyClaimedIds, bonus.id]
        else dailyClaimedIds = [...dailyClaimedIds, bonus.id]
      }

      setBoard(getQuestBoard(ctx, { dateKey, weekKey, userId: effectiveUserId, dailyClaimedIds, weeklyClaimedIds }))
    } catch {
      setBoard(null)
    }
  }, [buildContext, effectiveUserId])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (!board) return null

  return (
    <Card>
      <QuestSection title="오늘의 퀘스트" quests={board.daily} allClear={board.dailyAllClear} allClearText="오늘의 퀘스트를 모두 완료했어요!" />
      <div style={{ marginTop: spacing.lg }}>
        <QuestSection title="이번 주 퀘스트" quests={board.weekly} allClear={board.weeklyAllClear} allClearText="이번 주 퀘스트를 모두 완료했어요!" />
      </div>
    </Card>
  )
}

function QuestSection({ title, quests, allClear, allClearText }) {
  return (
    <div>
      <h3 style={{ margin: `0 0 ${spacing.sm}px`, fontSize: font.size.md, fontWeight: 700, color: colors.textStrong }}>{title}</h3>
      {allClear && (
        <p
          style={{
            margin: `0 0 ${spacing.sm}px`,
            padding: `${spacing.xs}px ${spacing.md}px`,
            borderRadius: radius.pill,
            background: colors.primarySurface,
            color: colors.primary,
            fontSize: font.size.xs,
            fontWeight: 700,
          }}
        >
          🎉 {allClearText}
        </p>
      )}
      <div>
        {quests.map((quest) => (
          <div
            key={quest.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.sm,
              padding: `${spacing.sm}px 0`,
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: font.size.sm, fontWeight: 600, color: colors.textStrong }}>
                {quest.title} <span style={{ color: colors.primary, fontWeight: 700 }}>+{quest.xp}XP</span>
              </p>
              <p style={{ margin: 0, fontSize: font.size.xs, color: colors.textSub }}>{quest.description}</p>
            </div>
            {quest.claimed ? (
              <span style={{ fontSize: font.size.xs, color: colors.primary, fontWeight: 700, whiteSpace: 'nowrap' }}>완료 ✓</span>
            ) : (
              <span style={{ fontSize: font.size.xs, color: colors.muted, whiteSpace: 'nowrap' }}>진행 중</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
