import AchievementRing from './AchievementRing.jsx'
import Card from './Card.jsx'
import ProgressBarFill from './ProgressBarFill.jsx'
import { buildNutrientStatusRows, formatNutrient, NUTRIENT_STATUS } from '../lib/nutrition.js'
import { calcScore } from '../lib/nutritionScore.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

const STATUS_PILL_META = {
  [NUTRIENT_STATUS.DEFICIENT]: { label: '부족', color: colors.deficientText, surface: colors.deficientSurface },
  [NUTRIENT_STATUS.SATISFIED]: { label: '충족', color: colors.satisfied, surface: colors.satisfiedSurface },
  [NUTRIENT_STATUS.EXCEEDED]: { label: '초과', color: colors.dangerText, surface: colors.dangerSurface },
}

// 식단 탭 개편(리텐션 강화 v7) — 화면 맨 위 요약: "오늘의 점수"(0~100) 링 + 칼로리 바 + 부족/충족/초과
// pill. 점수는 새 계산이 아니라 LeaderboardCard가 이미 "41점"으로 보여주던 calcScore를 그대로
// 재사용한다(같은 숫자가 두 곳에 다르게 나오면 안 되므로). 부족/충족/초과는 달력 탭
// NutritionStatusPanel과 동일한 buildNutrientStatusRows/NUTRIENT_STATUS를 재사용한다.
export default function TodayScoreSummary({ todayTotal, recommended }) {
  const score = calcScore(todayTotal, recommended)
  const calorieActual = todayTotal?.calories ?? 0
  const calorieRec = recommended?.calories ?? 0
  const caloriePercent = calorieRec > 0 ? Math.min(100, Math.round((calorieActual / calorieRec) * 100)) : 0
  const calorieRemaining = Math.max(0, calorieRec - calorieActual)

  const rows = buildNutrientStatusRows(recommended, todayTotal)
  const countOf = (status) => rows.filter((r) => r.status === status).length

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
        <AchievementRing percent={score ?? 0} size={88} strokeWidth={10}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: font.size.xl, fontWeight: 800, color: colors.title, lineHeight: 1.1 }}>{score ?? '-'}</div>
            <div style={{ fontSize: 10, color: colors.textSub }}>오늘의 점수</div>
          </div>
        </AchievementRing>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: font.size.xs, color: colors.textSub }}>칼로리</p>
          <p style={{ margin: '2px 0 6px', fontSize: font.size.md, fontWeight: 800, color: colors.textStrong }}>
            {formatNutrient(calorieActual)} / {formatNutrient(calorieRec)}kcal
          </p>
          <div style={{ height: 6, borderRadius: radius.pill, background: colors.track, overflow: 'hidden' }}>
            <ProgressBarFill percent={caloriePercent} color={colors.primary} />
          </div>
          <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: font.size.xs, color: colors.textSub }}>
            {calorieRemaining > 0 ? `${formatNutrient(calorieRemaining)}kcal 더 필요해요` : '달성했어요'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
        {[NUTRIENT_STATUS.DEFICIENT, NUTRIENT_STATUS.SATISFIED, NUTRIENT_STATUS.EXCEEDED].map((status) => {
          const meta = STATUS_PILL_META[status]
          return (
            <span
              key={status}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: `${spacing.xs}px 0`,
                borderRadius: radius.pill,
                background: meta.surface,
                color: meta.color,
                fontSize: font.size.xs,
                fontWeight: 700,
              }}
            >
              {meta.label} {countOf(status)}
            </span>
          )
        })}
      </div>
    </Card>
  )
}
