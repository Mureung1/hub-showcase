import Pressable from './Pressable.jsx'
import { FOOD_CATEGORIES } from '../lib/foodCategory.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// 지도 탭에서 "어떤 종류가 당기는지"를 고르는 칩 줄. 자유 입력이 아니라 정해진 목록에서 고르게 하는
// 이유: 검색어를 그대로 받으면 영양소 기반 추천 로직과 섞였을 때 결과 품질을 보장할 수 없고,
// 모바일에서 타이핑 없이 한 번에 누를 수 있는 편이 빠르다.
// 8개가 좁은 화면(360px)에 한 줄로 들어가지 않아 가로 스크롤로 둔다 — 줄바꿈으로 두 줄이 되면
// "내 주변에서 찾기" 버튼이 그만큼 아래로 밀린다.
export default function FoodCategoryChips({ value, onChange, disabled = false }) {
  return (
    <div style={{ marginBottom: spacing.md }}>
      <span
        style={{
          display: 'block',
          marginBottom: spacing.sm,
          fontSize: font.size.sm,
          fontWeight: 600,
          color: colors.textSub,
        }}
      >
        어떤 음식이 당기나요?
      </span>
      <div
        className="tds-no-scrollbar"
        role="radiogroup"
        aria-label="음식 종류"
        style={{
          display: 'flex',
          gap: spacing.sm,
          overflowX: 'auto',
          // 스크롤 컨테이너의 좌우 패딩이 없으면 첫/마지막 칩이 화면 끝에 딱 붙어 잘린 것처럼 보인다.
          padding: `${spacing.xs}px 2px`,
          margin: `-${spacing.xs}px -2px`,
        }}
      >
        {FOOD_CATEGORIES.map((category) => {
          const active = category.key === value
          return (
            <Pressable
              key={category.key}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(category.key)}
              style={{
                flexShrink: 0,
                // 터치 타깃 최소 44px(디자인 가이드) — 글자는 작아도 누르는 영역은 확보한다.
                minHeight: 44,
                padding: `0 ${spacing.lg}px`,
                borderRadius: radius.pill,
                border: 'none',
                background: active ? colors.primary : colors.bg,
                color: active ? '#fff' : colors.textSub,
                fontWeight: active ? 700 : 600,
                fontSize: font.size.sm,
                whiteSpace: 'nowrap',
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled ? 0.5 : 1,
              }}
            >
              {category.label}
            </Pressable>
          )
        })}
      </div>
    </div>
  )
}
