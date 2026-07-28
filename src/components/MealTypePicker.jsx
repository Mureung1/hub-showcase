import SegmentedControl from './SegmentedControl.jsx'
import { MEAL_TYPES, MEAL_TYPE_LABELS } from '../lib/mealType.js'
import { colors, font } from '../styles/theme.js'

const MEAL_TYPE_OPTIONS = MEAL_TYPES.map((key) => ({ key, label: MEAL_TYPE_LABELS[key] }))

// "아침/점심/저녁/기타" 세그먼트 선택. 활성 세그먼트는 Primary, 나머지는 Secondary 버튼 위계를 따른다(action.md).
export default function MealTypePicker({ value, recommended, onChange }) {
  return (
    <SegmentedControl
      options={MEAL_TYPE_OPTIONS}
      value={value}
      onChange={onChange}
      fontSize={font.size.sm}
      fontWeight={600}
      minHeight={44}
      renderCaption={(opt) =>
        recommended === opt.key && <span style={{ fontSize: font.size.xs, color: colors.muted }}>추천</span>
      }
    />
  )
}
