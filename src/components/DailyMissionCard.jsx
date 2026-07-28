import { useMemo } from 'react'
import { useUser } from '../context/UserContext.jsx'
import Card from './Card.jsx'
import Skeleton from './Skeleton.jsx'
import { evaluateMission, pickDailyMission } from '../lib/missions.js'
import { toDateKey } from '../lib/records.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// 완료 여부를 판정할 수 있는 미션(true/false)만 원형 체크 표시를 그린다 — all-satisfied류 정보성
// 미션(completed === null)은 애초에 "완료할 일"이 아니므로 빈 자리만 남겨 레이아웃을 맞춘다.
function MissionCheckMark({ completed }) {
  if (completed === null) return <div style={{ width: 28, flexShrink: 0 }} />
  return (
    <div
      aria-hidden="true"
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: completed ? colors.primary : colors.bg,
        border: completed ? 'none' : `1.5px solid ${colors.border}`,
        color: '#fff',
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      {completed ? '✓' : ''}
    </div>
  )
}

// 홈 최상단의 "오늘의 미션" 카드(트랙 1 §3) — 필라이즈의 AI 미션 메커니즘(부족 영양소 기반 하루 1개
// 목표, 익일 재방문 3.5배로 보고됨)을 본떴지만 실체는 룩업 테이블(src/data/missions.js)이라 AI 호출이
// 없다 — 공유 Gemini 리미터/Vercel 타임아웃/서버리스 콜드스타트 어느 것에도 걸리지 않는다.
export default function DailyMissionCard() {
  const { effectiveRecommended, effectiveUserId, todayMeals, todayMealsTotal, todayMealsLoading } = useUser()
  const dateKey = useMemo(() => toDateKey(new Date()), [])

  if (todayMealsLoading) {
    return (
      <Card>
        <Skeleton height={14} width="30%" style={{ marginBottom: spacing.sm }} />
        <Skeleton height={18} width="60%" />
      </Card>
    )
  }

  const mealCount = todayMeals.length
  const mission = pickDailyMission(effectiveRecommended, todayMealsTotal, {
    dateKey,
    userId: effectiveUserId,
    mealCount,
  })
  // recommended 자체가 없으면(성별조차 안 고른 게스트) 같은 화면의 SexPromptCard가 이미 그 안내를
  // 하고 있어, 여기서는 아무 것도 그리지 않는다(중복 안내 방지).
  if (!mission) return null

  const completed = evaluateMission(mission, todayMealsTotal, effectiveRecommended, { mealCount })

  return (
    <Card style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
      <MissionCheckMark completed={completed} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
          <p style={{ margin: 0, fontSize: font.size.xs, fontWeight: 700, color: colors.primary }}>오늘의 미션</p>
          {completed && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: colors.primary,
                background: colors.primarySurface,
                borderRadius: radius.pill,
                padding: '2px 8px',
              }}
            >
              완료
            </span>
          )}
        </div>
        <h3 style={{ margin: '2px 0 0', fontSize: font.size.md, fontWeight: 700, color: colors.textStrong }}>{mission.title}</h3>
        <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: font.size.sm, color: colors.textSub }}>{mission.description}</p>
      </div>
    </Card>
  )
}
