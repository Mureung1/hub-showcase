import { NUTRITION_SOURCE } from '../lib/nutrition.js'
import { colors, font, radius } from '../styles/theme.js'

// 음식 항목의 영양수치 출처 배지: 식약처DB/식약처DB(가공)(신뢰 최상, 같은 블루 톤) / 공식 영양표(프랜차이즈) / 추정
const SOURCE_STYLE = {
  [NUTRITION_SOURCE.DB]: { label: '식약처DB', bg: colors.infoSurface, color: colors.info },
  [NUTRITION_SOURCE.DB_PROCESS]: { label: '식약처DB(가공)', bg: colors.infoSurface, color: colors.info },
  [NUTRITION_SOURCE.OFFICIAL]: { label: '공식 영양표', bg: colors.primarySurface, color: colors.primary },
}
const DEFAULT_STYLE = { label: '추정', bg: colors.bg, color: colors.textSub }

export default function SourceBadge({ source }) {
  const { label, bg, color } = SOURCE_STYLE[source] || DEFAULT_STYLE
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: font.size.xs,
        fontWeight: 700,
        padding: '3px 10px',
        borderRadius: radius.pill,
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  )
}
