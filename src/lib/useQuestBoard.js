// QuestBoard.jsx(MY 탭 전체 게시판)와 HomeQuestCard.jsx(홈 화면 10초 로테이션 카드)가 공유하는
// 퀘스트 조회+자동클레임 훅 — 원래 QuestBoard.jsx 안에 있던 buildContext/refresh를 그대로 옮겼다.
// 주간 요일별 집계(days[])는 questWeekContext.js의 buildWeekDays로 뽑아 Analyze.jsx의
// runGamification과 공유한다(두 곳이 각자 day-loop를 복제하다 필드가 어긋났던 드리프트 버그 수정).
//
// authLoading이 끝나기 전에는 아무 것도 계산하지 않는다. effectiveUserId(UserContext.jsx)는 앱
// 로드 직후 dataStore.GUEST_ID로 시작했다가 supabase.auth.getSession()이 끝나는 순간 실제 uid로
// 바뀌는데, 이 전환을 기다리지 않고 로테이션(selectDailyQuests/selectWeeklyQuests, quests.js)을
// 계산해버리면 세션이 해결된 직후 완전히 다른 시드로 다시 계산돼 전혀 다른 3~5개 세트가 나온다 —
// "완료 안 한 다른 퀘스트가 엉뚱한 걸로 바뀐다" 버그의 실제 원인이 이것이었다.
//
// autoClaim: false면 조회만 하고 claimQuestsAndCelebrate(UserContext.jsx)를 부르지 않는다 — 홈 화면
// 카드처럼 같은 화면에 이 훅의 인스턴스가 여러 개 뜰 수 있는 곳에서 중복 클레임을 막기 위함이다.
// 게스트 클레임(dataStore.claimQuest)은 "브라우저 하나=탭 하나" 순차 실행을 가정할 뿐 동시 호출에
// 안전하지 않으므로, 실제 클레임은 항상 Analyze.jsx의 runGamification(끼니 저장 직후) 한 경로로만
// 일어나게 한다.
import { useCallback, useEffect, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import { getClaimedQuestIds, getMealsByDateRange } from './dataStore.js'
import { logicalDateKey, logicalWeekKey } from './logicalDate.js'
import { buildItemFlags, buildWeeklyStats, findNewlyCompletedAutoQuests, getQuestBoard, selectDailyQuests, selectWeeklyQuests } from './quests.js'
import { buildWeekDays } from './questWeekContext.js'
import { toDateKey } from './records.js'
import { calcStreak } from './streak.js'
import { getWaterIntake, getWaterTargetMl } from './waterIntake.js'

// StreakBadge.jsx와 동일한 조회 범위 — 스트릭 계산에 필요한 것 이상은 과하다.
const LOOKBACK_DAYS = 90

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

export function useQuestBoard({ dailyCount = 3, weeklyCount = 5, autoClaim = true } = {}) {
  const { authLoading, effectiveUserId, todayMeals, todayMealsTotal, effectiveRecommended, profile, claimQuestsAndCelebrate } =
    useUser()
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

    const days = await buildWeekDays({
      weekKey,
      todayCalendarKey,
      mealsForDate: (dayKey) => byDate[dayKey] ?? [],
      effectiveUserId,
      targetMl,
      effectiveRecommended,
    })

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
    // 세션 복원(authLoading)이 끝나기 전이면 effectiveUserId가 곧 바뀔 수 있으니 계산 자체를 미룬다.
    if (authLoading) return
    try {
      const { ctx, dateKey, weekKey, streak } = await buildContext()
      const dailyClaimedIds = await getClaimedQuestIds(dateKey)
      const weeklyClaimedIds = await getClaimedQuestIds(weekKey)

      if (!autoClaim) {
        setBoard(getQuestBoard(ctx, { dateKey, weekKey, userId: effectiveUserId, dailyClaimedIds, weeklyClaimedIds, dailyCount, weeklyCount }))
        return
      }

      const newlyCompleted = findNewlyCompletedAutoQuests(ctx, {
        dateKey,
        weekKey,
        userId: effectiveUserId,
        dailyClaimedIds,
        weeklyClaimedIds,
        dailyCount,
        weeklyCount,
      })
      const dailyQuests = selectDailyQuests(dateKey, effectiveUserId, dailyCount)
      const weeklyQuests = selectWeeklyQuests(weekKey, effectiveUserId, weeklyCount)

      const result = await claimQuestsAndCelebrate({
        newlyCompleted,
        dailyQuests,
        weeklyQuests,
        dailyClaimedIds,
        weeklyClaimedIds,
        dateKey,
        weekKey,
        streakCurrent: streak.current,
      })

      setBoard(
        getQuestBoard(ctx, {
          dateKey,
          weekKey,
          userId: effectiveUserId,
          dailyClaimedIds: result.dailyClaimedIds,
          weeklyClaimedIds: result.weeklyClaimedIds,
          dailyCount,
          weeklyCount,
        }),
      )
    } catch {
      setBoard(null)
    }
  }, [authLoading, buildContext, effectiveUserId, autoClaim, dailyCount, weeklyCount, claimQuestsAndCelebrate])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { board, refresh, loading: authLoading || board === null }
}
