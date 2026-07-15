import Card from './Card.jsx'
import { toggleVisibleNutrient, useVisibleNutrients } from '../lib/cardSettings.js'
import { NUTRIENT_LABELS } from '../lib/nutrition.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// 영양 카드(NutrientBars)에 보일 영양소를 켜고 끄는 체크리스트. 토글 즉시 cardSettings.js의
// storage에 반영되고, useVisibleNutrients를 구독하는 모든 화면의 NutrientBars가 곧바로 갱신된다.
export default function CardSettingsPanel() {
  const visible = useVisibleNutrients()

  return (
    <Card>
      <h3 style={{ fontSize: font.size.md, fontWeight: 600, margin: `0 0 ${spacing.xs}px`, color: colors.textStrong }}>
        카드 표시 항목
      </h3>
      <p style={{ margin: `0 0 ${spacing.md}px`, color: colors.textSub, fontSize: font.size.sm }}>
        영양 카드에 보일 영양소를 골라보세요.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
        {NUTRIENT_LABELS.map(({ key, label }) => {
          const active = visible[key]
          return (
            <button
              key={key}
              type="button"
              className="tds-press"
              onClick={() => toggleVisibleNutrient(key)}
              aria-pressed={active}
              style={{
                padding: `${spacing.sm}px ${spacing.lg}px`,
                borderRadius: radius.pill,
                border: 'none',
                background: active ? colors.primary : colors.bg,
                color: active ? '#fff' : colors.textSub,
                fontWeight: 600,
                fontSize: font.size.sm,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </Card>
  )
}
