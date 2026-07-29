import { useEffect, useRef, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import AppButton from './AppButton.jsx'
import SegmentedControl from './SegmentedControl.jsx'
import { buildMealBadges, drawMealCard, mergeNutrientTotals, TEMPLATES } from '../lib/mealCardCanvas.js'
import { calcScore } from '../lib/nutritionScore.js'
import { useFocusTrap } from '../lib/useFocusTrap.js'
import { colors, font, layout, radius, shadow, spacing } from '../styles/theme.js'

const TEMPLATE_OPTIONS = Object.values(TEMPLATES).map((t) => ({ key: t.key, label: t.label }))
// 미리보기 폭은 화면에 맞게 축소하되, 실제 캔버스/공유 이미지는 항상 TEMPLATES의 실제 해상도로 그린다.
const PREVIEW_WIDTH = 280

// AnalysisResultCard가 저장 성공과 동시에 언마운트되므로(Analyze.jsx의 resetToIdle), "저장 후" 화면을
// 따로 만들지 않고 결과 카드가 떠 있는 동안(저장 전/직후 상관없이) 바로 카드를 만들 수 있게 한다.
// 점수는 이미 저장된 오늘 누적(todayMealsTotal)에 지금 분석 결과(mealTotal)를 더해 "오늘 이 끼니까지
// 포함하면"을 보여준다 — 아직 실제로 저장 안 했어도 미리보기로는 정확하다.
export default function MealCardExporter({ photoUrl, mealTotal, onClose }) {
  const { todayMealsTotal, effectiveRecommended } = useUser()
  const containerRef = useFocusTrap(true, onClose)
  const canvasRef = useRef(null)
  const [template, setTemplate] = useState(TEMPLATES.story.key)
  const [shareError, setShareError] = useState('')

  const projectedTotal = mergeNutrientTotals(todayMealsTotal, mealTotal)
  const score = effectiveRecommended ? calcScore(projectedTotal, effectiveRecommended) : null
  const badges = buildMealBadges(mealTotal)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !photoUrl) return
    const { width, height } = TEMPLATES[template]
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const image = new Image()
    image.onload = () => {
      drawMealCard(ctx, { photoImage: image, width, height, score, badges })
    }
    image.src = photoUrl
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoUrl, template, score])

  async function handleShare() {
    setShareError('')
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setShareError('이미지를 만들지 못했어요. 다시 시도해주세요.')
        return
      }
      const file = new File([blob], 'mealyze-card.png', { type: 'image/png' })
      // 이 저장소에 navigator.share/canShare를 쓰는 첫 사례라 반드시 feature-detect 후 폴백한다.
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Mealyze', text: '오늘의 식단 기록' })
        } catch (err) {
          // AbortError는 사용자가 공유 시트를 취소한 것 — 정상 흐름이라 에러로 보여주지 않는다.
          if (err?.name !== 'AbortError') setShareError('공유하지 못했어요. 다시 시도해주세요.')
        }
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mealyze-card.png'
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="meal-card-exporter-title"
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
          background: colors.surface,
          borderRadius: radius.lg,
          boxShadow: shadow.card,
          padding: spacing.xl,
          marginBottom: `calc(${spacing.xl}px + env(safe-area-inset-bottom))`,
          boxSizing: 'border-box',
        }}
      >
        <h3 id="meal-card-exporter-title" style={{ margin: `0 0 ${spacing.md}px`, fontSize: font.size.lg, color: colors.textStrong }}>
          인증샷 카드 만들기
        </h3>

        <SegmentedControl options={TEMPLATE_OPTIONS} value={template} onChange={setTemplate} />

        <div style={{ display: 'flex', justifyContent: 'center', margin: `${spacing.lg}px 0` }}>
          <canvas
            ref={canvasRef}
            style={{
              width: PREVIEW_WIDTH,
              height: (PREVIEW_WIDTH * TEMPLATES[template].height) / TEMPLATES[template].width,
              borderRadius: radius.sm,
              boxShadow: shadow.card,
            }}
          />
        </div>

        {shareError && <p style={{ color: colors.dangerText, fontSize: font.size.sm, margin: `0 0 ${spacing.sm}px` }}>{shareError}</p>}

        <AppButton onClick={handleShare}>공유 · 저장하기</AppButton>
        <button
          type="button"
          className="tds-press"
          onClick={onClose}
          style={{
            display: 'block',
            margin: `${spacing.md}px auto 0`,
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
