import PlaceDuelComparisonList from './PlaceDuelComparisonList.jsx'
import { useFocusTrap } from '../lib/useFocusTrap.js'
import { compareTwoPlaces } from '../lib/placeDuel.js'
import { colors, font, layout, radius, shadow, spacing } from '../styles/theme.js'

const WINNER_TEXT = {
  A: (a) => `더 건강한 선택: ${a}`,
  B: (b) => `더 건강한 선택: ${b}`,
  tie: () => '두 곳이 막상막하예요!',
}

// 지도 탭 "주변 식당"에서 고른 두 곳을 1:1로 비교하는 모달(FR-18). ConfirmDialog.jsx와 동일한 시트
// 셸(useFocusTrap, tds-sheet)을 재사용하고, 본문만 듀얼 비교로 교체했다. 서버 호출 없이 MapPage.jsx가
// 이미 붙여둔 place.expected/priceRange/representativeMenu만으로 비교한다.
export default function PlaceDuelModal({ placeA, placeB, todayTotal, recommended, onClose }) {
  const containerRef = useFocusTrap(true, onClose)
  const { rows, overallWinner } = compareTwoPlaces(placeA.expected, placeB.expected, { todayTotal, recommended })

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="place-duel-title"
      ref={containerRef}
      tabIndex={-1}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(25, 31, 40, 0.45)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: layout.pagePaddingX,
      }}
      onClick={onClose}
    >
      <div
        className="tds-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: layout.maxWidth,
          maxHeight: '85vh',
          overflowY: 'auto',
          background: colors.surface,
          borderRadius: radius.lg,
          boxShadow: shadow.card,
          padding: spacing.xl,
          marginBottom: `calc(${spacing.xl}px + env(safe-area-inset-bottom))`,
          boxSizing: 'border-box',
        }}
      >
        <h3 id="place-duel-title" style={{ margin: `0 0 ${spacing.md}px`, fontSize: font.size.lg, color: colors.textStrong }}>
          영양 대결
        </h3>

        <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg }}>
          {[placeA, placeB].map((place) => (
            <div key={place.place_name} style={{ flex: 1, textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: font.size.sm, fontWeight: 700, color: colors.textStrong }}>{place.place_name}</p>
              {place.representativeMenu && (
                <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: font.size.xs, color: colors.textSub }}>
                  <strong style={{ fontWeight: 700, color: colors.textStrong }}>{place.representativeMenu}</strong>
                  {place.priceRange && (
                    <span> · 약 {place.priceRange.min.toLocaleString()}~{place.priceRange.max.toLocaleString()}원</span>
                  )}
                </p>
              )}
            </div>
          ))}
        </div>

        <PlaceDuelComparisonList rows={rows} />

        <p
          style={{
            margin: `${spacing.lg}px 0 0`,
            padding: spacing.md,
            borderRadius: radius.sm,
            background: colors.primarySurface,
            color: colors.primary,
            textAlign: 'center',
            fontWeight: 700,
            fontSize: font.size.md,
          }}
        >
          {overallWinner === 'A' && WINNER_TEXT.A(placeA.place_name)}
          {overallWinner === 'B' && WINNER_TEXT.B(placeB.place_name)}
          {overallWinner === 'tie' && WINNER_TEXT.tie()}
        </p>

        <button
          type="button"
          className="tds-press"
          onClick={onClose}
          style={{
            display: 'block',
            margin: `${spacing.lg}px auto 0`,
            background: 'none',
            border: 'none',
            fontSize: font.size.sm,
            fontWeight: 600,
            padding: 0,
            color: colors.muted,
            cursor: 'pointer',
          }}
        >
          닫기
        </button>
      </div>
    </div>
  )
}
