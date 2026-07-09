import { MEAL_TYPES, MEAL_TYPE_LABELS } from '../lib/mealType.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// "아침/점심/저녁/기타" 세그먼트 선택. 활성 세그먼트는 Primary, 나머지는 Secondary 버튼 위계를 따른다(action.md).
export default function MealTypePicker({ value, recommended, onChange }) {
  return (
    <div style={{ display: 'flex', gap: spacing.sm }}>
      {MEAL_TYPES.map((type) => {
        const active = value === type
        return (
          <div key={type} style={{ flex: 1, textAlign: 'center' }}>
            <button
              type="button"
              className="tds-press"
              onClick={() => onChange(type)}
              style={{
                width: '100%',
                minHeight: 44,
                boxSizing: 'border-box',
                border: 'none',
                borderRadius: radius.sm,
                background: active ? colors.primary : colors.bg,
                color: active ? '#fff' : colors.textSub,
                fontWeight: 600,
                fontSize: font.size.sm,
                cursor: 'pointer',
              }}
            >
              {MEAL_TYPE_LABELS[type]}
            </button>
            <div style={{ height: font.size.xs + 4, marginTop: spacing.xs }}>
              {recommended === type && <span style={{ fontSize: font.size.xs, color: colors.muted }}>추천</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
