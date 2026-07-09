import { NUTRIENT_LABELS } from '../lib/nutrition.js'
import { colors, font, spacing } from '../styles/theme.js'

// 막대 없이 글자만으로 정보를 전달한다: 영양소명(Typography 4) → 내 권장량/표준 평균 수치(Typography 6, 내 권장량은 Bold 강조)
// → 차이 문장(Typography 5, Bold). 색이 아니라 문장 자체가 의미를 담도록 한다.
function ComparisonRow({ label, unit, mine, standard, isLast }) {
  const diff = Math.round(mine - standard)
  const diffText =
    diff === 0
      ? '표준 평균과 같아요'
      : diff > 0
        ? `표준보다 ${label} +${diff}${unit} 더 필요해요`
        : `표준보다 ${label} ${diff}${unit} 적어도 돼요`

  return (
    <div
      style={{
        marginBottom: spacing.lg,
        paddingBottom: spacing.lg,
        borderBottom: isLast ? 'none' : `1px solid ${colors.border}`,
      }}
    >
      <h3
        style={{
          margin: `0 0 ${spacing.sm}px`,
          fontSize: font.size.xl,
          fontWeight: 600,
          color: colors.textStrong,
          letterSpacing: '-0.02em',
        }}
      >
        {label}
      </h3>
      <p style={{ margin: `0 0 ${spacing.xs}px`, fontSize: font.size.md, color: colors.textSub }}>
        내 권장량{' '}
        <strong style={{ fontSize: font.size.lg, fontWeight: 700, color: colors.primary }}>
          {Math.round(mine)}
          {unit}
        </strong>
        {'  ·  표준 평균 '}
        {Math.round(standard)}
        {unit}
      </p>
      <p style={{ margin: 0, fontSize: font.size.lg, fontWeight: 700, color: colors.textStrong }}>{diffText}</p>
    </div>
  )
}

// mine/standard: 둘 다 NutrientSet(calories/protein/carbs/fat/fiber/sodium)
export default function StandardComparisonList({ mine, standard }) {
  return (
    <div>
      {NUTRIENT_LABELS.map(({ key, label, unit }, i) => (
        <ComparisonRow
          key={key}
          label={label}
          unit={unit}
          mine={mine[key]}
          standard={standard[key]}
          isLast={i === NUTRIENT_LABELS.length - 1}
        />
      ))}
    </div>
  )
}
