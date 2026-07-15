import { MEAL_TYPE_LABELS, normalizeMealType } from '../lib/mealType.js'
import { colors, font, radius } from '../styles/theme.js'

// 식사 시간대 라벨. 신뢰도/상태 신호가 아니라 단순 분류 표시라 은은한 중립 톤만 쓴다.
export default function MealTypeBadge({ mealType }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: font.size.xs,
        fontWeight: 700,
        padding: '3px 10px',
        borderRadius: radius.pill,
        background: colors.bg,
        color: colors.textSub,
      }}
    >
      {MEAL_TYPE_LABELS[normalizeMealType(mealType)]}
    </span>
  )
}
