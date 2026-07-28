import Card from './Card.jsx'
import { buildSchoolMealSummary } from '../lib/schoolMealSummary.js'
import { colors, font, spacing } from '../styles/theme.js'

// 트랙 3 §3 — "한 판 통합 분석"(급식/학식) 직후 결과 카드 바로 아래에만 뜬다. 새 판정 로직이 아니라
// buildDeficiencyRows(이미 있던 부족 영양소 판정)와 이 끼니의 합계를 조인한 것뿐이다. recommended나
// mealTotal이 없으면(신체정보 미입력 등) 조용히 아무 것도 그리지 않는다.
export default function SchoolMealNutritionSummary({ recommended, mealTotal, mealType }) {
  if (!recommended || !mealTotal) return null
  const { message } = buildSchoolMealSummary(recommended, mealTotal, mealType)

  return (
    <Card style={{ background: colors.primarySurface, boxShadow: 'none' }}>
      <p style={{ margin: 0, fontSize: font.size.xs, fontWeight: 700, color: colors.primary }}>오늘 급식 체크</p>
      <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: font.size.sm, color: colors.textStrong, fontWeight: 600 }}>
        {message}
      </p>
    </Card>
  )
}
