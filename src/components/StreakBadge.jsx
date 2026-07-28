import { useEffect, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import { getMealsByDateRange } from '../lib/dataStore.js'
import { toDateKey } from '../lib/records.js'
import { calcStreak } from '../lib/streak.js'
import { colors, font, radius } from '../styles/theme.js'

// 연속 기록 조회 창 — 전체 기록을 다 훑을 필요 없이 "최근 며칠 이어졌는지"만 보여주는 장식용 배지라
// 90일이면 충분하고, Calendar.jsx가 매달 한 번씩 하는 것과 같은 범위 조회 하나로 끝난다.
const LOOKBACK_DAYS = 90

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

// 홈 미션 카드 위의 작은 연속 기록 배지(트랙 1 §4). 실패하거나 아직 연속이 없으면(0일) 조용히
// 아무 것도 그리지 않는다 — 장식용 액센트라 에러 카드로 화면을 차지할 만큼 중요하지 않다(끼니
// 삭제·저장 같은 사용자 행동에만 적용되는 "무음 실패 금지" 원칙과는 다른 층위).
export default function StreakBadge() {
  const { effectiveUserId } = useUser()
  const [streak, setStreak] = useState(null)

  useEffect(() => {
    let cancelled = false
    const todayKey = toDateKey(new Date())
    const startKey = toDateKey(daysAgo(LOOKBACK_DAYS))

    getMealsByDateRange(startKey, todayKey)
      .then((byDate) => {
        if (cancelled) return
        setStreak(calcStreak(Object.keys(byDate), todayKey))
      })
      .catch(() => {
        if (!cancelled) setStreak(null)
      })

    return () => {
      cancelled = true
    }
  }, [effectiveUserId])

  if (!streak || streak.current === 0) return null

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        borderRadius: radius.pill,
        background: colors.primarySurface,
        color: colors.primary,
        fontSize: font.size.xs,
        fontWeight: 700,
        marginBottom: 8,
      }}
    >
      <span aria-hidden="true">🔥</span>
      {streak.current}일 연속 기록 중
    </div>
  )
}
