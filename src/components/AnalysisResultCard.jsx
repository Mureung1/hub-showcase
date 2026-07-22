import AppButton from './AppButton.jsx'
import Card from './Card.jsx'
import MealTypePicker from './MealTypePicker.jsx'
import { NutrientBars } from './NutritionCard.jsx'
import SourceBadge from './SourceBadge.jsx'
import Spinner from './Spinner.jsx'
import { formatNutrient } from '../lib/nutrition.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// 홈 탭 분석 영역의 RESULT 상태 카드. 촬영 카드가 있던 **같은 자리**를 그대로 차지한다 —
// 예전에는 결과가 화면 맨 아래에 따로 생겨서 스크롤을 내려야 보였다.
//
// 카드 안에 헤더(썸네일+요약) / 영양소 막대 / 시간대 선택 / 버튼 두 개가 순서대로 들어간다.
// "언제 드셨어요?"와 저장 버튼도 예전에는 카드 밖 별도 섹션이었지만, 결과를 보고 바로 시간대를 고르고
// 저장하는 흐름이라 한 카드 안에 모았다.

const THUMB_SIZE = 72

// 사진 없이 메뉴 이름만으로 분석한 경우 썸네일 자리에 놓는 식기 아이콘.
function UtensilsPlaceholder() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: radius.sm,
        flexShrink: 0,
        background: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.muted,
      }}
    >
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
      </svg>
    </div>
  )
}

// 음식이 여러 개면(한 끼 세트) 대표 이름 + 외 N개로 줄인다 — 식단 탭의 SetMealCard와 같은 규칙.
function titleOf(items) {
  if (items.length === 0) return '분석 결과'
  return items.length === 1 ? items[0].name : `${items[0].name} 외 ${items.length - 1}개`
}

export default function AnalysisResultCard({
  analysis,
  photoUrl,
  mealType,
  recommendedMealType,
  onMealTypeChange,
  onSave,
  onRetake,
  saving,
}) {
  const { items, total } = analysis
  const title = titleOf(items)

  return (
    <Card className="tds-card-swap">
      {/* a. 헤더 — 올렸던 사진 + 출처/음식명/총 칼로리 */}
      <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center' }}>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="분석한 음식 사진"
            style={{
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: radius.sm,
              objectFit: 'cover',
              flexShrink: 0,
              display: 'block',
            }}
          />
        ) : (
          <UtensilsPlaceholder />
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          <SourceBadge source={items[0]?.source} />
          <h3
            style={{
              margin: `${spacing.xs}px 0 2px`,
              fontSize: font.size.lg,
              color: colors.textStrong,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </h3>
          <p style={{ margin: 0, fontSize: font.size.sm, color: colors.textSub }}>
            총 <strong style={{ color: colors.textStrong }}>{formatNutrient(total.calories)}</strong> kcal
          </p>
        </div>
      </div>

      {/* b. 영양소 막대 — 하단에 따로 있던 카드와 동일한 컴포넌트를 그대로 재사용 */}
      <div style={{ marginTop: spacing.xl }}>
        <NutrientBars nutrients={total} />
      </div>

      {/* c. 시간대 선택 — 저장에 함께 실리는 값이라 저장 버튼 바로 위에 둔다 */}
      <div style={{ marginTop: spacing.lg }}>
        <h4 style={{ fontSize: font.size.md, fontWeight: 600, margin: `0 0 ${spacing.xs}px`, color: colors.textStrong }}>
          언제 드셨어요?
        </h4>
        <p style={{ margin: `0 0 ${spacing.md}px`, color: colors.textSub, fontSize: font.size.sm }}>
          시간대를 선택하면 식단 기록에 함께 표시돼요.
        </p>
        <MealTypePicker value={mealType} recommended={recommendedMealType} onChange={onMealTypeChange} />
      </div>

      {/* d. 저장(주) / 다시 찍기(보조) — 한 화면에 채워진 주 버튼은 하나만 둔다 */}
      <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.xl }}>
        <AppButton onClick={onSave} disabled={saving} style={{ flex: 6 }}>
          {saving && <Spinner size={16} />}
          {saving ? '저장 중...' : '저장하기'}
        </AppButton>
        <AppButton variant="outline" onClick={onRetake} disabled={saving} style={{ flex: 4 }}>
          다시 찍기
        </AppButton>
      </div>
    </Card>
  )
}
