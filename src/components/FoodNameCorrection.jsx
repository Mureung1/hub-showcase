import Pressable from './Pressable.jsx'
import { COOKING_METHODS, detectCookingMethod } from '../lib/foodNameCorrection.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// 결과 카드 안의 "조리법 보정" 줄 — AI가 정한 DB 검색명이 틀렸을 때 사용자가 1탭으로 고친다.
//
// 이 앱의 정확도는 dbSearchName 하나에 걸려 있는데(그게 틀리면 뒤의 매칭·중량·보정이 전부 엉뚱한
// 음식의 수치가 된다), 그중 가장 자주 틀리는 축이 조리법이다 — 같은 재료라도 구이/찜/조림/튀김이
// 식약처 DB에 서로 다른 레코드로 있고 사진으로는 양념 색과 국물 유무로만 구분해야 한다.
//
// **매칭이 확실한 항목에는 아예 띄우지 않는다**(호출부가 판단). 잘 맞은 결과 밑에 "고쳐보세요"가
// 붙어 있으면 맞는 값을 의심하게 만들고, 카드가 이미 빽빽하다.
export default function FoodNameCorrection({ searchName, matchedName, busy, onCorrect }) {
  const current = detectCookingMethod(searchName)

  return (
    <div style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTop: `1px solid ${colors.border}` }}>
      <p style={{ margin: `0 0 ${spacing.xs}px`, fontSize: font.size.xs, color: colors.textSub }}>
        {matchedName ? (
          <>
            <strong style={{ color: colors.textStrong }}>{matchedName}</strong> 기준으로 계산했어요. 다른 조리법인가요?
          </>
        ) : (
          <>
            <strong style={{ color: colors.textStrong }}>{searchName}</strong>을(를) DB에서 못 찾아 AI 추정으로 계산했어요. 조리법을 골라보세요.
          </>
        )}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs }}>
        {COOKING_METHODS.map(({ key, label }) => {
          const active = key === current
          return (
            <Pressable
              key={key}
              as="button"
              type="button"
              disabled={busy || active}
              onClick={() => onCorrect(key)}
              aria-pressed={active}
              style={{
                padding: `6px ${spacing.md}px`,
                borderRadius: radius.pill,
                border: `1px solid ${active ? colors.primary : colors.border}`,
                background: active ? colors.primarySurface : colors.surface,
                color: active ? colors.primary : colors.textSub,
                fontSize: font.size.xs,
                fontWeight: active ? 700 : 500,
                // 다시 조회하는 동안 흐리게 — 여러 칩을 연달아 눌러 요청이 겹치는 걸 막는다.
                opacity: busy && !active ? 0.5 : 1,
                cursor: busy || active ? 'default' : 'pointer',
              }}
            >
              {label}
            </Pressable>
          )
        })}
      </div>
    </div>
  )
}
