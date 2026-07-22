import { useEffect, useMemo, useRef } from 'react'
import { useUser } from '../context/UserContext.jsx'
import { COUPANG_DISCLOSURE, nutrientLabel } from '../data/coupangProducts.js'
import { trackAdClick, trackAdImpression } from '../lib/adData.js'
import { openExternalLink } from '../lib/externalLink.js'
import { toDateKey } from '../lib/records.js'
import { recommendAdProducts } from '../utils/adRecommendation.js'
import { colors, font, radius, spacing } from '../styles/theme.js'

// "부족한 영양소는?" 가로 스크롤 광고 배너(PRD v2.0 FR-3.1). 식단 탭의 요약 카드 **아래**에 놓는다 —
// 스크롤 최상단을 광고가 점유하지 않게.
//
// 어떤 상품을 보여줄지는 전부 utils/adRecommendation.js가 정한다(실측 부족 영양소 -> 없으면 폴백).
// 그 함수가 빈 배열을 반환하지 않으므로 이 배너는 항상 표시된다.
//
// [생략 불가] AD 배지와 쿠팡 파트너스 고지 문구는 어떤 상태에서도 렌더링을 건너뛰지 않는다(FR-3.3).
// 조건부 렌더 안에 넣지 말 것.

const CARD_HEIGHT = 80
const THUMB_SIZE = 56

function formatPrice(price) {
  return `${Number(price).toLocaleString('ko-KR')}원`
}

// 이미지가 없거나(승인 전 자리표시자) 로드에 실패해도 카드가 비어 보이지 않게, 영양소 라벨 첫 글자를
// 띄우는 정사각 배지로 대체한다.
function Thumbnail({ product }) {
  const base = {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.sm,
    flexShrink: 0,
    objectFit: 'cover',
    background: colors.bg,
  }

  if (!product.imageUrl) {
    return (
      <div
        style={{
          ...base,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.primary,
          fontSize: font.size.sm,
          fontWeight: 800,
          background: colors.primarySurface,
        }}
        aria-hidden="true"
      >
        {nutrientLabel(product.nutrient).slice(0, 2)}
      </div>
    )
  }

  return <img src={product.imageUrl} alt="" style={base} loading="lazy" />
}

function AdProductCard({ product }) {
  function handleClick() {
    trackAdClick(product.id)
    // 웹뷰(APK)에서는 시스템 브라우저로, 웹에서는 새 탭으로 연다(externalLink.js가 플랫폼을 판단).
    openExternalLink(product.partnersUrl)
  }

  return (
    <a
      href={product.partnersUrl}
      target="_blank"
      rel="noreferrer sponsored nofollow"
      onClick={(e) => {
        e.preventDefault()
        handleClick()
      }}
      className="tds-press"
      style={{
        flexShrink: 0,
        width: 232,
        height: CARD_HEIGHT,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        textDecoration: 'none',
        scrollSnapAlign: 'start',
      }}
    >
      <Thumbnail product={product} />

      <div style={{ minWidth: 0, flex: 1 }}>
        {/* 상품명은 1줄 말줄임 — 표시 규칙상 상품명 그대로만 쓰고 효능 문구는 넣지 않는다. */}
        <p
          style={{
            margin: 0,
            fontSize: font.size.sm,
            fontWeight: 600,
            color: colors.textStrong,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {product.productName}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, marginTop: 2 }}>
          <span style={{ fontSize: font.size.sm, fontWeight: 700, color: colors.textStrong }}>
            {formatPrice(product.price)}
          </span>
          <span
            style={{
              fontSize: font.size.xs,
              color: colors.primary,
              background: colors.primarySurface,
              borderRadius: radius.pill,
              padding: '1px 6px',
              whiteSpace: 'nowrap',
            }}
          >
            {nutrientLabel(product.nutrient)}
          </span>
        </div>
      </div>
    </a>
  )
}

export default function DeficientNutrientAds() {
  const { effectiveRecommended, todayMealsTotal, todayMeals } = useUser()
  const dateKey = toDateKey(new Date())

  const { products } = useMemo(
    () =>
      recommendAdProducts({
        recommended: effectiveRecommended,
        total: todayMealsTotal,
        mealCount: todayMeals?.length ?? 0,
        dateKey,
      }),
    [effectiveRecommended, todayMealsTotal, todayMeals, dateKey],
  )

  // 노출 집계는 상품당 1회만(FR-3.3). 리렌더/추천 결과 재계산으로 같은 상품이 다시 그려져도 중복으로
  // 세지 않도록, 이 화면이 살아있는 동안 이미 센 id를 기억한다.
  const countedIds = useRef(new Set())
  useEffect(() => {
    for (const product of products) {
      if (countedIds.current.has(product.id)) continue
      countedIds.current.add(product.id)
      trackAdImpression(product.id)
    }
  }, [products])

  return (
    <section style={{ marginBottom: spacing.md }} aria-label="부족한 영양소 관련 광고">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.sm,
        }}
      >
        <h2 style={{ margin: 0, fontSize: font.size.lg, color: colors.textStrong }}>부족한 영양소는?</h2>
        {/* 표시광고법: 광고임을 명확히 표시. 어떤 상태에서도 생략하지 않는다. */}
        <span
          style={{
            fontSize: font.size.xs,
            fontWeight: 700,
            color: colors.muted,
            border: `1px solid ${colors.border}`,
            borderRadius: 4,
            padding: '1px 6px',
          }}
        >
          AD
        </span>
      </div>

      <div
        className="tds-no-scrollbar"
        style={{
          display: 'flex',
          gap: spacing.sm,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: spacing.xs,
        }}
      >
        {products.map((product) => (
          <AdProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* 쿠팡 파트너스 필수 고지 — 문구 변경/생략 금지. */}
      <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: font.size.xs, color: colors.muted, lineHeight: 1.5 }}>
        {COUPANG_DISCLOSURE}
      </p>
    </section>
  )
}
