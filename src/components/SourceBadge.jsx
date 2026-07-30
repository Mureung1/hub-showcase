import { NUTRITION_SOURCE } from '../lib/nutrition.js'
import { colors, font, radius } from '../styles/theme.js'

// 음식 항목의 영양수치 출처 배지: 식약처DB/식약처DB(가공)(신뢰 최상, 같은 블루 톤) / 레시피DB(식품
// 안전나라 조리식품 레시피 DB — 식약처 음식/가공식품 DB에 없는 창작·조합형 메뉴명 보완) / 공식
// 영양표(프랜차이즈) / 라벨 추출(포장지 영양성분표를 그대로 읽은 값, 공식 영양표와 같은 신뢰 등급) /
// 직접입력(사용자가 저장 전에 값을 고침, 트랙 2 §4) / 추정
const SOURCE_STYLE = {
  [NUTRITION_SOURCE.DB]: { label: '식약처DB', bg: colors.infoSurface, color: colors.info },
  [NUTRITION_SOURCE.DB_PROCESS]: { label: '식약처DB(가공)', bg: colors.infoSurface, color: colors.info },
  [NUTRITION_SOURCE.RECIPE_DB]: { label: '레시피DB', bg: colors.bg, color: colors.textSub },
  [NUTRITION_SOURCE.OFFICIAL]: { label: '공식 영양표', bg: colors.primarySurface, color: colors.primary },
  [NUTRITION_SOURCE.LABEL]: { label: '라벨 추출', bg: colors.primarySurface, color: colors.primary },
  [NUTRITION_SOURCE.MANUAL]: { label: '직접입력', bg: colors.primarySurface, color: colors.primary },
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
