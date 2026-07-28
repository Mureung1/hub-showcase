import { colors, font, radius, spacing } from '../styles/theme.js'

// 화면마다 따로 손으로 그리던 "가로로 나눠진 버튼 여러 개 중 하나만 선택" 패턴의 공용 버전
// (성별/활동량, 분석 모드, 달력 상태, AI 식습관 분석 기간, 식사 시간대가 각자 비슷한 마크업을 조금씩
// 다른 값으로 복제하고 있었다 — 어느 것도 role="radiogroup"/aria-checked가 없어 스크린리더에는
// "선택됨"이 전혀 전달되지 않았다). FoodCategoryChips/CardSettingsPanel과 같은 role/aria 규칙을 따른다.
//
// 호출부마다 실제로 다른 크기·색만 props로 열어둔다(임의로 넓힌 옵션이 아니라 기존 5곳을 그대로
// 옮기는 데 필요한 값만) — fill/gap/padding/fontSize/fontWeight/minHeight/accentColor/
// inactiveTextColor 모두 기존 화면 중 하나가 실제로 쓰던 값이다.
//
// options: [{ key, label, activeColor? }] — activeColor는 옵션마다 강조색이 달라야 할 때만
// (달력의 좋음/보통/나쁨) 개별로 주고, 없으면 accentColor 하나를 공유한다(나머지 전부).
// renderCaption: (option) => ReactNode | null — 세그먼트 아래 보조 문구가 필요할 때만(식사 시간대의
// "추천" 표시). 생략한 호출부는 원래 레이아웃 그대로다.
export default function SegmentedControl({
  options,
  value,
  onChange,
  disabled = false,
  fill = true,
  gap = spacing.sm,
  padding = `${spacing.md}px 0`,
  fontSize = font.size.md,
  fontWeight = 700,
  minHeight,
  accentColor = colors.primary,
  inactiveTextColor = colors.textSub,
  renderCaption,
  style,
}) {
  return (
    <div role="radiogroup" style={{ display: 'flex', gap, ...style }}>
      {options.map((opt) => {
        const active = opt.key === value
        return (
          <div key={opt.key} style={fill ? { flex: 1, textAlign: 'center' } : undefined}>
            <button
              type="button"
              className="tds-press"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.key)}
              disabled={disabled}
              style={{
                width: fill ? '100%' : 'auto',
                minHeight,
                boxSizing: 'border-box',
                padding,
                borderRadius: radius.sm,
                border: 'none',
                background: active ? (opt.activeColor ?? accentColor) : colors.bg,
                color: active ? '#fff' : inactiveTextColor,
                fontWeight,
                fontSize,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled && !active ? 0.5 : 1,
              }}
            >
              {opt.label}
            </button>
            {renderCaption && <div style={{ height: font.size.xs + 4, marginTop: spacing.xs }}>{renderCaption(opt)}</div>}
          </div>
        )
      })}
    </div>
  )
}
