import { useNavigate } from 'react-router-dom'
import AchievementRing from './AchievementRing.jsx'
import Card from './Card.jsx'
import { useUser } from '../context/UserContext.jsx'
import { getRecommendedMealType, MEAL_TYPE_LABELS } from '../lib/mealType.js'
import { formatNutrient } from '../lib/nutrition.js'
import { colors, font, spacing } from '../styles/theme.js'

export const MEAL_ORDER = ['breakfast', 'lunch', 'dinner']

// "아침만 기록됨 · 점심을 기록해보세요" 형태의 진행 안내. MEAL_ORDER 세 라벨(아침/점심/저녁)은
// 전부 받침으로 끝나 항상 "을"이 맞으므로(을/를 조사 분기 불필요) 고정 문구로 이어붙인다.
//
// 다음 끼니는 "아직 안 찍은 것 중 시간대상 지금 가장 자연스러운 것"을 우선한다 — 그냥 아침→점심→저녁
// 순으로만 고르면(리뷰에서 발견) 점심·저녁을 이미 찍은 저녁 시간대에도 "아침을 기록해보세요"처럼
// 어색한 문구가 나온다. 지금 시간대(getRecommendedMealType, mealType.js)가 아직 안 찍혔으면 그걸
// 최우선으로 권하고, 이미 찍었으면 순서대로 처음 안 찍은 끼니로 되돌아간다.
export function buildStatusMessage(todayMeals, now = new Date()) {
  const recordedTypes = new Set((todayMeals ?? []).map((m) => m.mealType).filter((t) => MEAL_ORDER.includes(t)))
  const recordedLabels = MEAL_ORDER.filter((t) => recordedTypes.has(t)).map((t) => MEAL_TYPE_LABELS[t])
  const timeAppropriate = getRecommendedMealType(now)
  const nextMealType = !recordedTypes.has(timeAppropriate) && MEAL_ORDER.includes(timeAppropriate)
    ? timeAppropriate
    : MEAL_ORDER.find((t) => !recordedTypes.has(t))

  if (!nextMealType) return `${recordedLabels.join(' ')} 모두 기록했어요`
  if (recordedLabels.length === 0) return `${MEAL_TYPE_LABELS[nextMealType]}을 기록해보세요`
  return `${recordedLabels.join(' ')}만 기록됨 · ${MEAL_TYPE_LABELS[nextMealType]}을 기록해보세요`
}

// 홈 탭 개편(리텐션 강화 v7) — 분석 모드 카드 아래 "오늘 요약" 위젯. 새 계산이 아니라 useUser()가 이미
// 들고 있는 todayMealsTotal/effectiveRecommended를 그대로 재사용한다(새 fetch 없음). 여기 쓰는 퍼센트는
// 식단 탭 TodayScoreSummary의 calcScore(종합 평가 점수)가 아니라 단순 칼로리 달성률
// (actual/recommended*100)이다 — 이 위젯은 "얼마나 먹었는지" 빠른 확인용이지 점수 평가가 목적이 아니라서.
// 신체정보가 없어 recommended가 없으면(SexPromptCard가 이미 그 안내를 하고 있으므로) 조용히 숨는다.
export default function HomeTodaySummary() {
  const navigate = useNavigate()
  const { todayMeals, todayMealsTotal, effectiveRecommended } = useUser()

  if (!effectiveRecommended) return null

  const actual = todayMealsTotal?.calories ?? 0
  const recommended = effectiveRecommended?.calories ?? 0
  const percent = recommended > 0 ? Math.min(100, Math.round((actual / recommended) * 100)) : 0

  return (
    <Card onClick={() => navigate('/meals')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
        <AchievementRing percent={percent} size={48} strokeWidth={5}>
          <span style={{ fontSize: 11, fontWeight: 800, color: colors.title }}>{percent}%</span>
        </AchievementRing>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: font.size.xs, fontWeight: 700, color: colors.primary }}>오늘 요약</p>
          <p style={{ margin: '2px 0 0', fontSize: font.size.sm, fontWeight: 700, color: colors.textStrong }}>
            {formatNutrient(actual)} / {formatNutrient(recommended)}kcal · {percent}%
          </p>
          <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: font.size.xs, color: colors.textSub }}>
            {buildStatusMessage(todayMeals)}
          </p>
        </div>
        <span aria-hidden="true" style={{ flexShrink: 0, color: colors.muted, fontSize: font.size.lg }}>
          ›
        </span>
      </div>
    </Card>
  )
}
